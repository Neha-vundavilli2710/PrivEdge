from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Conversation, HumanReview, Message, User
from app.security.deps import get_current_user
from app.services import analytics
from app.routes.chat import conv_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/statistics")
def statistics(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The signed-in user's OWN activity (Dashboard, Insights, Profile pages)."""
    s = analytics.summary(db, user_id=user.user_id)
    convs = db.query(Conversation).filter(Conversation.user_id == user.user_id).order_by(Conversation.updated_at.desc()).all()
    pending = db.query(Message).join(Conversation).filter(Conversation.user_id == user.user_id, Message.status == "PENDING_REVIEW").count()
    return {**s, "conversations": len(convs), "pending_reviews": pending, "recent": [conv_summary(c) for c in convs[:4] if c.messages]}
