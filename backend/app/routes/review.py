"""Human Review path: queue, claim, decide (approve / modify / reject)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import HumanReview, Message, RoutingLog, User
from app.schemas.schemas import ReviewAction
from app.security.deps import require_reviewer
from app.security.encryption import decrypt, encrypt
from app.security.masking import mask_text
from app.services import analytics, notifications
from app.services.audit import audit
from app.services.policy import level, levels, risk_label
from app.services.response_validator import validate_response
from app.core.config import get_settings

router = APIRouter(prefix="/review", tags=["human-review"])
STATUS = {"PENDING": "Pending", "IN_REVIEW": "In Review", "APPROVED": "Approved", "MODIFIED": "Modified", "REJECTED": "Rejected"}


def _code(r: HumanReview) -> str:
    return f"REV-{r.review_id:03d}"


def _log(db: Session, r: HumanReview) -> RoutingLog | None:
    return db.query(RoutingLog).filter_by(message_id=r.message_id).first()


def _item(db: Session, r: HumanReview) -> dict:
    log, msg = _log(db, r), db.get(Message, r.message_id)
    q = mask_text(decrypt(msg.message))  # reviewers only see masked text
    return {
        "id": r.review_id, "code": _code(r), "query": q[:160], "status": STATUS[r.status],
        "risk": risk_label(log.risk_score) if log else "Medium",
        "sensitivity": level(log.sensitivity_score, get_settings().sensitivity_threshold) if log else "Low",
        "created_at": r.created_at.isoformat(),
    }


def _get(db: Session, review_id: int) -> HumanReview:
    r = db.get(HumanReview, review_id)
    if not r:
        raise HTTPException(404, "Review not found")
    return r


@router.get("/pending")
def pending(q: str = "", db: Session = Depends(get_db), user: User = Depends(require_reviewer)):
    rows = db.query(HumanReview).filter(HumanReview.status.in_(["PENDING", "IN_REVIEW"])).order_by(HumanReview.created_at.desc()).all()
    items = [_item(db, r) for r in rows]
    return [i for i in items if q.lower() in i["query"].lower() or q.lower() in i["code"].lower()] if q else items


@router.get("/history")
def history(db: Session = Depends(get_db), user: User = Depends(require_reviewer)):
    qy = db.query(HumanReview).filter(HumanReview.status.in_(["APPROVED", "MODIFIED", "REJECTED"]))
    if user.role != "ADMIN":
        qy = qy.filter(HumanReview.reviewer_id == user.user_id)
    out = []
    for r in qy.order_by(HumanReview.completed_at.desc()).all():
        reviewer = db.get(User, r.reviewer_id) if r.reviewer_id else None
        mins = (r.completed_at - r.created_at.replace(tzinfo=r.completed_at.tzinfo)).total_seconds() / 60 if r.completed_at else None
        out.append({**_item(db, r), "action": STATUS[r.status], "reviewer": reviewer.name if reviewer else "—",
                    "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                    "review_minutes": round(mins, 1) if mins is not None else None})
    return out


@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(require_reviewer)):
    return analytics.review_stats(db, None if user.role == "ADMIN" else user.user_id)


@router.get("/{review_id}")
def detail(review_id: int, db: Session = Depends(get_db), user: User = Depends(require_reviewer)):
    r = _get(db, review_id)
    log, msg = _log(db, r), db.get(Message, r.message_id)
    audit(db, user.user_id, "review_viewed", _code(r))
    return {
        **_item(db, r), "query_full": mask_text(decrypt(msg.message)), "user_ref": f"USR-{msg.conversation.user_id:05d}",
        "ai_draft": mask_text(decrypt(r.ai_draft)), "has_draft": bool(r.ai_draft and decrypt(r.ai_draft)),
        "comment": r.review_comment, "reviewer_id": r.reviewer_id,
        "analysis": {**{k.lower(): v for k, v in levels(log).items()}, "route": "Human Review",
                     "scores": {"privacy": log.privacy_score, "sensitivity": log.sensitivity_score, "complexity": log.complexity_score,
                                "risk": log.risk_score, "latency": log.latency_score, "human_required": log.human_required_score if hasattr(log, "human_required_score") else float(log.human_required)},
                     "domain": log.domain, "reason": log.reason} if log else None,
    }


@router.post("/{review_id}/claim")
def claim(review_id: int, db: Session = Depends(get_db), user: User = Depends(require_reviewer)):
    r = _get(db, review_id)
    if r.status not in ("PENDING", "IN_REVIEW"):
        raise HTTPException(409, "Review already completed")
    if r.status == "IN_REVIEW" and r.reviewer_id != user.user_id and user.role != "ADMIN":
        raise HTTPException(409, "Another reviewer is already handling this request")
    r.status, r.reviewer_id = "IN_REVIEW", user.user_id
    db.commit()
    audit(db, user.user_id, "review_claimed", _code(r))
    return _item(db, r)


@router.post("/{review_id}")
def decide(review_id: int, body: ReviewAction, db: Session = Depends(get_db), user: User = Depends(require_reviewer)):
    r = _get(db, review_id)
    if r.status not in ("PENDING", "IN_REVIEW"):
        raise HTTPException(409, "Review already completed")
    if r.status == "IN_REVIEW" and r.reviewer_id != user.user_id and user.role != "ADMIN":
        raise HTTPException(409, "Another reviewer is already handling this request")
    msg = db.get(Message, r.message_id)
    query = decrypt(msg.message)

    if body.action == "approve":
        final = decrypt(r.ai_draft)
        if not final:
            raise HTTPException(400, "No AI draft is available to approve. Use 'modify' and write the response.")
        status = "APPROVED"
    elif body.action == "modify":
        if not (body.final_response or "").strip():
            raise HTTPException(400, "final_response is required when modifying")
        final, status = body.final_response.strip(), "MODIFIED"
    else:
        final = "After human review, your request could not be answered." + (f" Reviewer note: {body.comment.strip()}" if body.comment.strip() else "")
        status = "REJECTED"

    v = validate_response(final, query, "human", human_approved=True)
    if not v.ok:
        raise HTTPException(422, f"Response failed validation: {', '.join(v.issues)}")

    r.status, r.reviewer_id, r.review_comment = status, user.user_id, body.comment.strip()
    r.final_response, r.completed_at = encrypt(v.text), datetime.now(timezone.utc)
    msg.response, msg.status = encrypt(v.text), "REVIEWED"
    db.commit()
    audit(db, user.user_id, f"review_{body.action}", _code(r))
    # Always on - this is core UX for the user, not an admin-toggleable notification type.
    notifications.notify_user(db, msg.conversation.user_id, "Query reviewed",
                              f"Your request was {status.lower()} by a human reviewer. Open the conversation to see the final response.")
    return {**_item(db, r), "final_response": v.text}
