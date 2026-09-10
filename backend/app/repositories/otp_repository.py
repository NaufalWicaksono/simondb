from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.otp_code import OtpCode


def get_valid_otp(
    db: Session,
    user_id: int,
    code: str,
    purpose: str = "password_reset",
) -> Optional[OtpCode]:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    return (
        db.query(OtpCode)
        .filter(
            OtpCode.user_id == user_id,
            OtpCode.code == code,
            OtpCode.purpose == purpose,
            OtpCode.is_used == False,
            OtpCode.expires_at > now,
        )
        .order_by(OtpCode.id.desc())
        .first()
    )


def create(
    db: Session,
    user_id: int,
    code: str,
    purpose: str,
    expires_at: datetime,
) -> OtpCode:
    otp = OtpCode(
        user_id=user_id,
        code=code,
        purpose=purpose,
        expires_at=expires_at,
        is_used=False,
    )
    db.add(otp)
    db.commit()
    db.refresh(otp)
    return otp


def mark_used(db: Session, otp: OtpCode) -> None:
    otp.is_used = True
    db.commit()
