import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.invitation_token import InvitationToken
from app.models.user import User
from app.repositories import invitation_repository, role_repository, user_repository


def create_invitation(
    db: Session,
    role_id: int,
    created_by: int,
    expires_in_days: int = 7,
) -> Tuple[Optional[InvitationToken], Optional[str]]:
    role = role_repository.get_by_id(db, role_id)
    if not role:
        return None, "Role yang dipilih tidak valid."

    token_str = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=expires_in_days)

    invitation = invitation_repository.create(
        db,
        token=token_str,
        role_id=role_id,
        created_by=created_by,
        expires_at=expires_at,
    )
    return invitation, None


def validate_token(db: Session, token: str) -> Optional[InvitationToken]:
    return invitation_repository.get_valid_token(db, token)


def list_invitations(db: Session) -> List[InvitationToken]:
    return invitation_repository.get_all(db)


def register_user(
    db: Session,
    token: str,
    name: str,
    username: str,
    email: str,
    password: str,
) -> Tuple[Optional[User], Optional[str]]:
    invitation = invitation_repository.get_valid_token(db, token)
    if not invitation:
        return None, "Token undangan tidak valid atau telah kedaluwarsa."

    if user_repository.get_by_username(db, username):
        return None, f"Username '{username}' sudah digunakan."

    if user_repository.get_by_email(db, email):
        return None, f"Email '{email}' sudah terdaftar."

    password_hash = hash_password(password)
    user = user_repository.create(
        db,
        name=name,
        username=username,
        email=email,
        password_hash=password_hash,
        role_id=invitation.role_id,
    )

    invitation_repository.mark_used(db, invitation, used_by=user.id)
    return user, None
