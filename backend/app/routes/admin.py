"""Admin: users, query logs, analytics, review monitoring, system monitoring, settings."""
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import AuditLog, Conversation, KnowledgeDocument, Message, RoutingLog, User
from app.schemas.schemas import UserAdminUpdate
from app.security.deps import require_admin
from app.services import analytics, cloud_ai, edge_ai, rag_service, settings_store
from app.services.audit import audit
from app.services.policy import levels

router = APIRouter(prefix="/admin", tags=["admin"])
STATUS = {"COMPLETED": "Completed", "PENDING_REVIEW": "Pending Review", "REVIEWED": "Reviewed", "ERROR": "Error"}


def _user_row(db: Session, u: User) -> dict:
    n = db.query(RoutingLog).filter(RoutingLog.user_id == u.user_id).count()
    return {"id": u.user_id, "code": f"USR-{u.user_id:03d}", "name": u.name, "email": u.email, "role": u.role.title(),
            "status": "Active" if u.is_active else "Inactive", "joined": u.created_at.isoformat(), "queries": n}


@router.get("/statistics")
def statistics(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    s = analytics.summary(db)
    s["users"] = db.query(User).count()
    s["review"] = analytics.review_stats(db)
    s["recent_events"] = [{"type": "warning" if "fail" in a.action else "info", "msg": f"{a.action}: {a.detail}"[:120], "time": a.timestamp.isoformat()}
                          for a in db.query(AuditLog).order_by(AuditLog.audit_id.desc()).limit(6).all()]
    return s


@router.get("/routing-analytics")
def routing_analytics(days: int = 7, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return analytics.summary(db, days=max(1, min(days, 90)))


@router.get("/review-monitoring")
def review_monitoring(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from app.db.models import HumanReview
    events = []
    for r in db.query(HumanReview).order_by(HumanReview.review_id.desc()).limit(10).all():
        rev = db.get(User, r.reviewer_id) if r.reviewer_id else None
        log = db.query(RoutingLog).filter_by(message_id=r.message_id).first()
        from app.services.policy import risk_label
        events.append({"code": f"REV-{r.review_id:03d}", "action": r.status.replace("_", " ").title(), "reviewer": rev.name if rev else "Unassigned",
                       "risk": risk_label(log.risk_score) if log else "Medium", "time": (r.completed_at or r.created_at).isoformat()})
    return {**analytics.review_stats(db), "recent_events": events}


@router.get("/users")
def users(q: str = "", role: str = "", status: str = "", admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = [_user_row(db, u) for u in db.query(User).order_by(User.user_id).all()]
    return [r for r in rows if (not q or q.lower() in r["name"].lower() or q.lower() in r["email"].lower())
            and (not role or r["role"].lower() == role.lower()) and (not status or r["status"].lower() == status.lower())]


@router.get("/users/{user_id}")
def user_detail(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    s = analytics.summary(db, user_id=user_id)
    convs = db.query(Conversation).filter(Conversation.user_id == user_id).order_by(Conversation.updated_at.desc()).limit(5).all()
    return {**_user_row(db, u), "counts": s["counts"], "conversations": db.query(Conversation).filter_by(user_id=user_id).count(),
            "recent_activity": [{"title": c.title, "route": c.messages[-1].route if c.messages else "cloud", "updated_at": c.updated_at.isoformat()} for c in convs]}


@router.patch("/users/{user_id}")
def update_user(user_id: int, body: UserAdminUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    if u.user_id == admin.user_id and (body.is_active is False or (body.role and body.role != "ADMIN")):
        raise HTTPException(400, "You cannot deactivate or demote your own admin account")
    if body.role:
        u.role = body.role
    if body.is_active is not None:
        u.is_active = body.is_active
    db.commit()
    audit(db, admin.user_id, "user_updated", f"user={u.user_id} role={u.role} active={u.is_active}")
    return _user_row(db, u)


@router.get("/logs")
def query_logs(q: str = "", route: str = "", limit: int = 200, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    qy = db.query(RoutingLog, Message).join(Message, Message.message_id == RoutingLog.message_id)
    if route in ("edge", "cloud", "human"):
        qy = qy.filter(RoutingLog.selected_route == route)
    out = []
    for log, msg in qy.order_by(RoutingLog.routing_id.desc()).limit(max(1, min(limit, 1000))).all():
        code = f"Q-{msg.message_id}"
        if q and q.lower() not in code.lower():
            continue
        out.append({"id": code, "ts": log.timestamp.isoformat(), **{k.lower(): v for k, v in levels(log).items()}, "route": log.selected_route,
                    "ms": int(log.processing_time * 1000) if log.processing_time is not None else None, "status": STATUS.get(msg.status, msg.status),
                    "scores": {"privacy": log.privacy_score, "sensitivity": log.sensitivity_score, "complexity": log.complexity_score, "risk": log.risk_score},
                    "router": log.router_used, "reason": log.reason})  # content is intentionally NOT exposed to admins
    return out


@router.get("/monitoring")
def monitoring(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    def timed(fn):
        t = time.perf_counter()
        ok, detail = fn()
        return ok, detail, f"{int((time.perf_counter() - t) * 1000)}ms"
    def dbcheck():
        db.execute(text("SELECT 1"))
        return True, "connected"
    def ragcheck():
        n = db.query(KnowledgeDocument).filter_by(status="Published").count()
        rag_service.retrieve(db, "privedge routing")
        return n > 0, f"{n} published documents"
    services = []
    for name, fn, warn_if_false in [("API Gateway", lambda: (True, "running"), False), ("Database", dbcheck, False),
                                    (f"Cloud AI (Gemini: {get_settings().gemini_model})", cloud_ai.ping, True),
                                    (f"Edge AI (Ollama: {get_settings().ollama_model})", edge_ai.ping, True),
                                    ("RAG / Knowledge Index (TF-IDF)", ragcheck, True)]:
        try:
            ok, detail, ms = timed(fn)
        except Exception as e:
            ok, detail, ms = False, type(e).__name__, "-"
        services.append({"name": name, "status": "Operational" if ok else ("Warning" if warn_if_false else "Down"), "responseTime": ms, "detail": detail})
    events = [{"time": a.timestamp.isoformat(), "type": "warning" if "fail" in a.action else "info", "msg": f"{a.action} {a.detail}".strip()[:140]}
              for a in db.query(AuditLog).order_by(AuditLog.audit_id.desc()).limit(10).all()]
    return {"services": services, "timeline": events, "router_mode": get_settings().router_mode}


@router.get("/settings")
def get_settings_api(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return {"settings": settings_store.get_all(db), "enforced": settings_store.ENFORCED, "not_enforced": settings_store.NOT_ENFORCED}


@router.put("/settings")
def put_settings(body: dict, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    saved = settings_store.save_all(db, body)
    audit(db, admin.user_id, "settings_changed")
    return {"settings": saved, "enforced": settings_store.ENFORCED, "not_enforced": settings_store.NOT_ENFORCED}
