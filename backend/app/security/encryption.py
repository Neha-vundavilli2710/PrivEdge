"""Application-level encryption of stored message text (Fernet, from `cryptography`).
If ENCRYPTION_KEY is unset, a key is derived from JWT_SECRET (fine for dev only)."""
import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


@lru_cache
def _fernet() -> Fernet:
    s = get_settings()
    key = s.encryption_key.encode() if s.encryption_key else base64.urlsafe_b64encode(hashlib.sha256(s.jwt_secret.encode()).digest())
    return Fernet(key)


def encrypt(text: str) -> str:
    return _fernet().encrypt((text or "").encode()).decode()


def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return "[unreadable: encryption key changed]"
