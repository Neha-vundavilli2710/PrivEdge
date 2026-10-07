from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.schemas.schemas import LoginIn, PasswordChange, ProfileUpdate, RegisterIn
from app.security.auth import create_access_token, hash_password, verify_password
from app.security.deps import get_current_user
from app.services.audit import audit

router = APIRouter(prefix="/auth", tags=["auth"])


def user_out(u: User) -> dict:
    return {"id": u.user_id, "name": u.name, "email": u.email, "role": u.role.lower(), "is_active": u.is_active, "created_at": u.created_at.isoformat()}


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with this email already exists")
    u = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password), role="USER")  # role is never client-controlled
    db.add(u)
    db.commit()
    audit(db, u.user_id, "register", email)
    return {"user": user_out(u), "access_token": create_access_token(u.user_id, u.role), "token_type": "bearer"}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == body.email.lower()).first()
    if not u or not verify_password(body.password, u.password_hash):
        audit(db, u.user_id if u else None, "login_failed", body.email.lower())
        raise HTTPException(401, "Invalid email or password")
    if not u.is_active:
        raise HTTPException(403, "This account has been deactivated")
    u.last_active_at = datetime.now(timezone.utc)
    audit(db, u.user_id, "login", u.email)
    return {"access_token": create_access_token(u.user_id, u.role), "token_type": "bearer", "user": user_out(u)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.patch("/me")
def update_me(body: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.email and body.email.lower() != user.email:
        if db.query(User).filter(User.email == body.email.lower()).first():
            raise HTTPException(409, "Email already in use")
        user.email = body.email.lower()
    if body.name:
        user.name = body.name.strip()
    db.commit()
    return user_out(user)


@router.post("/change-password")
def change_password(body: PasswordChange, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    audit(db, user.user_id, "password_changed")
    return {"ok": True}
