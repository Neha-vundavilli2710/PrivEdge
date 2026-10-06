from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.security.deps import get_current_user
from app.services import notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])

TYPE_ICON = {"review_completed": "check", "high_risk": "alert", "system_alert": "shield", "review_backlog": "book"}


def _out(n) -> dict:
    return {"id": n.notification_id, "type": n.type, "icon": TYPE_ICON.get(n.type, "bell"), "title": n.title, "message": n.message, "read": n.read, "created_at": n.created_at.isoformat()}


@router.get("")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = notifications.list_for(db, user)
    return {"items": [_out(n) for n in rows], "unread": sum(1 for n in rows if not n.read)}


@router.post("/read-all")
def read_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"marked": notifications.mark_all_read(db, user)}
