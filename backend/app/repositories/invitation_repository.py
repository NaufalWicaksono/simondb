from typing import Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.invitation_token import InvitationToken


def get_by_token(db: Session, token: str) -> Optional[InvitationToken]:
    return db.query(InvitationToken).filter(InvitationToken.token == token).first()


def get_valid_token(db: Session, token: str) -> Optional[InvitationToken]:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    return (
        db.query(InvitationToken)
        .filter(
            InvitationToken.token == token,
            InvitationToken.is_used == False,
            InvitationToken.expires_at > now,
        )
        .first()
    )


def get_all(db: Session) -> List[InvitationToken]:
    return db.query(InvitationToken).order_by(InvitationToken.created_at.desc()).all()


def create(
    db: Session,
    token: str,
    role_id: int,
    created_by: int,
    expires_at: datetime,
) -> InvitationToken:
    invitation = InvitationToken(
        token=token,
        role_id=role_id,
        created_by=created_by,
        expires_at=expires_at,
        is_used=False,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


def mark_used(db: Session, invitation: InvitationToken, used_by: int) -> InvitationToken:
    invitation.is_used = True
    invitation.used_by = used_by
    invitation.used_at = datetime.utcnow()
    db.commit()
    db.refresh(invitation)
    return invitation
