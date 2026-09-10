from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class CreateInvitationRequest(BaseModel):
    role_id: int
    expires_in_days: int = Field(default=7, ge=1, le=30)


class InvitationResponse(BaseModel):
    id: int
    token: str
    role_id: int
    role_name: Optional[str] = None
    created_by: Optional[int] = None
    is_used: bool
    used_at: Optional[datetime] = None
    expires_at: datetime
    created_at: datetime
    invitation_url: Optional[str] = None

    class Config:
        from_attributes = True


class RegisterViaInvitationRequest(BaseModel):
    token: str
    name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
