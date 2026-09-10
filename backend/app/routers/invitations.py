from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import require_role
from app.database.session import get_db
from app.schemas.invitation import (
    CreateInvitationRequest,
    InvitationResponse,
    RegisterViaInvitationRequest,
)
from app.schemas.user import UserResponse
from app.services import invitation_service

router = APIRouter(prefix="/api/invitations", tags=["Invitations"])


@router.get("", response_model=List[InvitationResponse])
def list_invitations(
    _current: dict = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    invitations = invitation_service.list_invitations(db)
    result = []
    for inv in invitations:
        resp = InvitationResponse(
            id=inv.id,
            token=inv.token,
            role_id=inv.role_id,
            role_name=inv.role.name if inv.role else None,
            created_by=inv.created_by,
            is_used=inv.is_used,
            used_at=inv.used_at,
            expires_at=inv.expires_at,
            created_at=inv.created_at,
            invitation_url=f"{settings.FRONTEND_URL}/register?token={inv.token}",
        )
        result.append(resp)
    return result


@router.post("", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    request: CreateInvitationRequest,
    current_user: dict = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    inv, error = invitation_service.create_invitation(
        db,
        role_id=request.role_id,
        created_by=current_user["id"],
        expires_in_days=request.expires_in_days,
    )
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    return InvitationResponse(
        id=inv.id,
        token=inv.token,
        role_id=inv.role_id,
        role_name=inv.role.name if inv.role else None,
        created_by=inv.created_by,
        is_used=inv.is_used,
        used_at=inv.used_at,
        expires_at=inv.expires_at,
        created_at=inv.created_at,
        invitation_url=f"{settings.FRONTEND_URL}/register?token={inv.token}",
    )


@router.get("/validate/{token}")
def validate_invitation_token(token: str, db: Session = Depends(get_db)):
    inv = invitation_service.validate_token(db, token)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token tidak valid atau sudah kedaluwarsa.",
        )
    return {
        "valid": True,
        "role_id": inv.role_id,
        "role_name": inv.role.name if inv.role else "viewer",
    }


@router.post("/register", response_model=UserResponse)
def register_with_token(
    request: RegisterViaInvitationRequest,
    db: Session = Depends(get_db),
):
    user, error = invitation_service.register_user(
        db,
        token=request.token,
        name=request.name,
        username=request.username,
        email=request.email,
        password=request.password,
    )
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    return user
