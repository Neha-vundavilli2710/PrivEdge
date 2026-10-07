"""Authorization dependencies (RBAC)."""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import User
from app.security.auth import decode_token
from app.services import settings_store

bearer = HTTPBearer(auto_error=False)


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_token(creds.credentials)
        user = db.get(User, int(payload["sub"]))
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found or deactivated")

    # Idle-session timeout: distinct from the JWT's own hard expiry (JWT_EXPIRE_MINUTES).
    # A valid, unexpired token is still rejected if the account has been inactive too long.
    if settings_store.get_all(db)["security"]["sessionTimeout"]:
        now = datetime.now(timezone.utc)
        idle_limit = timedelta(minutes=get_settings().session_idle_minutes)
        if user.last_active_at and (now - user.last_active_at.replace(tzinfo=timezone.utc)) > idle_limit:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired due to inactivity. Please log in again.")
        user.last_active_at = now
        db.commit()
    return user


def require_roles(*roles: str):
    def dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission for this action")
        return user
    return dep


require_reviewer = require_roles("REVIEWER", "ADMIN")
require_admin = require_roles("ADMIN")
