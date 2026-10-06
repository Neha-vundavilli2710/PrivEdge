from sqlalchemy.orm import Session

from app.db.models import AuditLog
from app.services import settings_store


def audit(db: Session, user_id: int | None, action: str, detail: str = "") -> None:
    if not settings_store.get_all(db)["security"]["auditLog"]:
        return
    db.add(AuditLog(user_id=user_id, action=action, detail=detail[:1000]))
    db.commit()
