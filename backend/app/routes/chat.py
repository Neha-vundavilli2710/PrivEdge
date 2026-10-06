from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Conversation, RoutingLog, User
from app.schemas.schemas import AnalyzeIn, ChatIn, TitleUpdate
from app.security.deps import get_current_user
from app.security.encryption import decrypt
from app.services.chat_service import analyze_only, get_owned_conversation, process_chat
from app.services.document_extract import extract_text
from app.services.policy import levels

router = APIRouter(tags=["chat"])

STATUS_LABEL = {"COMPLETED": "Completed", "PENDING_REVIEW": "Under Review", "REVIEWED": "Reviewed", "ERROR": "Error"}


def _decision(log: RoutingLog | None) -> dict | None:
    if not log:
        return None
    lv = {k.lower(): v for k, v in levels(log).items()}
    return {**lv, "humanReview": log.selected_route == "human", "reason": log.reason}


def conv_summary(c: Conversation) -> dict:
    last = c.messages[-1] if c.messages else None
    return {
        "id": c.conversation_id, "title": c.title, "route": last.route if last else "cloud",
        "status": STATUS_LABEL.get(last.status, "Completed") if last else "Completed",
        "msgs": len(c.messages) * 2, "preview": (decrypt(last.response)[:120] if last else ""),
        "created_at": c.created_at.isoformat(), "updated_at": c.updated_at.isoformat(),
    }


@router.post("/chat")
def chat(body: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return process_chat(db, user, body.message.strip(), body.conversation_id)


@router.post("/chat/attachment")
async def chat_attachment(file: UploadFile = File(...), message: str = Form(""), conversation_id: int | None = Form(None),
                          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Upload a document (.txt/.md/.pdf) alongside an optional note. The extracted text
    flows through the exact same privacy/risk analysis and Edge/Cloud/Human routing as a
    typed message - a confidential PDF is routed to Edge AI the same way confidential
    pasted text would be."""
    raw = await file.read()
    extracted = extract_text(file.filename or "attachment", raw)
    caption = message.strip() or f"\U0001F4CE {file.filename}"
    combined = f"{message.strip()}\n\n" if message.strip() else ""
    combined += f"[Attached file: {file.filename}]\n{extracted}"
    return process_chat(db, user, combined, conversation_id, caption=caption, attachment_name=file.filename)


@router.post("/analyze")
def analyze(body: AnalyzeIn, user: User = Depends(get_current_user)):
    """Dry-run: privacy/risk/complexity analysis + routing decision. Nothing is sent to any LLM or stored."""
    return analyze_only(body.message.strip())


@router.get("/conversations")
def list_conversations(q: str = "", route: str = Query("", pattern="^(|edge|cloud|human)$"),
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convs = db.query(Conversation).filter(Conversation.user_id == user.user_id).order_by(Conversation.updated_at.desc()).all()
    out = [conv_summary(c) for c in convs if c.messages]
    if q:
        out = [c for c in out if q.lower() in c["title"].lower()]
    if route:
        out = [c for c in out if c["route"] == route]
    return out


@router.get("/chat/history")
def chat_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list_conversations(q="", route="", user=user, db=db)


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = get_owned_conversation(db, user, conversation_id)
    return {**conv_summary(c), "messages": [{
        "message_id": m.message_id, "text": decrypt(m.caption) if m.caption else decrypt(m.message), "response": decrypt(m.response), "route": m.route,
        "attachment_name": m.attachment_name, "status": m.status.lower(), "timestamp": m.timestamp.isoformat(), "decision": _decision(m.routing_log),
    } for m in c.messages]}


@router.patch("/conversations/{conversation_id}")
def rename_conversation(conversation_id: int, body: TitleUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = get_owned_conversation(db, user, conversation_id)
    c.title = body.title.strip()
    db.commit()
    return conv_summary(c)


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Full delete of the user's conversation, including its routing logs and any review rows."""
    c = get_owned_conversation(db, user, conversation_id)
    for m in c.messages:
        if m.review:
            db.delete(m.review)
        if m.routing_log:
            db.delete(m.routing_log)
    db.flush()
    db.delete(c)  # messages removed by cascade
    db.commit()
