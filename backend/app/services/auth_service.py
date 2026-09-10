import random
import string
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.repositories import user_repository, otp_repository, refresh_token_repository


def authenticate_user(
    db: Session, identifier: str, password: str
) -> Optional[Tuple[User, str, str]]:
    user = user_repository.get_by_username_or_email(db, identifier)
    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    if not user.is_active:
        return None

    role_name = user.role.name if user.role else "viewer"
    token_data = {"sub": str(user.id), "role": role_name, "username": user.username}

    access_token = create_access_token(token_data)
    refresh_token_str = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
        hours=settings.JWT_REFRESH_EXPIRE_HOURS
    )

    refresh_token_repository.create(
        db,
        user_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at,
    )

    return user, access_token, refresh_token_str


def refresh_tokens(db: Session, refresh_token_str: str) -> Optional[Tuple[str, str, dict]]:
    token_obj = refresh_token_repository.get_valid_token(db, refresh_token_str)
    if not token_obj:
        return None

    user = user_repository.get_by_id(db, token_obj.user_id)
    if not user or not user.is_active:
        return None

    # Revoke old token
    refresh_token_repository.revoke(db, token_obj)

    # Issue new pair
    role_name = user.role.name if user.role else "viewer"
    token_data = {"sub": str(user.id), "role": role_name, "username": user.username}
    new_access_token = create_access_token(token_data)

    new_refresh_str = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
        hours=settings.JWT_REFRESH_EXPIRE_HOURS
    )
    refresh_token_repository.create(
        db,
        user_id=user.id,
        token=new_refresh_str,
        expires_at=expires_at,
    )

    user_data = {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "role": role_name,
    }

    return new_access_token, new_refresh_str, user_data


def request_password_reset(db: Session, email: str) -> Tuple[bool, Optional[str]]:
    user = user_repository.get_by_email(db, email)
    if not user:
        return False, None

    code = "".join(random.choices(string.digits, k=6))
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
        minutes=settings.OTP_EXPIRE_MINUTES
    )

    otp_repository.create(
        db,
        user_id=user.id,
        code=code,
        purpose="password_reset",
        expires_at=expires_at,
    )

    # For demo environment, return debug OTP code directly
    return True, code


def verify_and_reset_password(
    db: Session, email: str, otp: str, new_password: str
) -> bool:
    user = user_repository.get_by_email(db, email)
    if not user:
        return False

    otp_obj = otp_repository.get_valid_otp(db, user.id, otp, purpose="password_reset")
    if not otp_obj:
        return False

    otp_repository.mark_used(db, otp_obj)
    user_repository.update(db, user, password_hash=hash_password(new_password))
    refresh_token_repository.revoke_all_user_tokens(db, user.id)

    return True


def change_password(db: Session, user_id: int, old_pass: str, new_pass: str) -> bool:
    user = user_repository.get_by_id(db, user_id)
    if not user:
        return False

    if not verify_password(old_pass, user.password_hash):
        return False

    user_repository.update(db, user, password_hash=hash_password(new_pass))
    refresh_token_repository.revoke_all_user_tokens(db, user.id)
    return True
