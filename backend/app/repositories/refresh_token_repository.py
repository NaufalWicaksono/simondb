from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.refresh_token import RefreshToken


def get_by_token(db: Session, token: str) -> Optional[RefreshToken]:
    return db.query(RefreshToken).filter(RefreshToken.token == token).first()


def get_valid_token(db: Session, token: str) -> Optional[RefreshToken]:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    return (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > now,
        )
        .first()
    )


def create(
    db: Session,
    user_id: int,
    token: str,
    expires_at: datetime,
) -> RefreshToken:
    rt = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at,
        is_revoked=False,
    )
    db.add(rt)
    db.commit()
    db.refresh(rt)
    return rt


def revoke(db: Session, refresh_token: RefreshToken) -> None:
    refresh_token.is_revoked = True
    db.commit()


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.is_revoked == False,
    ).update({"is_revoked": True})
    db.commit()
