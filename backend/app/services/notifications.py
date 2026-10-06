"""In-app notifications. This is what makes the Admin "Notification Preferences"
settings (highRisk / systemAlerts / reviewBacklog) functional, without needing a
real email/push infrastructure. "Your query was reviewed" is always created
(core UX for the end user), independent of the admin toggles."""
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import Notification, User

ROLE_TYPES = {"high_risk": "reviewer,admin", "system_alert": "admin", "review_backlog": "reviewer,admin"}


def notify_user(db: Session, user_id: int, title: str, message: str, type_: str = "review_completed") -> None:
    db.add(Notification(user_id=user_id, roles=None, type=type_, title=title, message=message))
    db.commit()


def notify_roles(db: Session, type_: str, title: str, message: str) -> None:
    """Broadcasts to a role group. Deduplicated: skips if an unread notification of the
    same type already exists, so a busy system doesn't spam the same alert repeatedly."""
    roles = ROLE_TYPES[type_]
    dup = db.query(Notification).filter(Notification.type == type_, Notification.roles == roles, Notification.read.is_(False)).first()
    if dup:
        return
    db.add(Notification(user_id=None, roles=roles, type=type_, title=title, message=message))
    db.commit()


def list_for(db: Session, user: User, limit: int = 20) -> list[Notification]:
    role_match = [Notification.roles.contains(user.role.lower())]
    rows = (db.query(Notification).filter(or_(Notification.user_id == user.user_id, *role_match))
            .order_by(Notification.notification_id.desc()).limit(limit).all())
    return rows


def mark_all_read(db: Session, user: User) -> int:
    role_match = [Notification.roles.contains(user.role.lower())]
    n = (db.query(Notification).filter(or_(Notification.user_id == user.user_id, *role_match), Notification.read.is_(False))
         .update({Notification.read: True}, synchronize_session=False))
    db.commit()
    return n
