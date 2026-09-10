from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    VerifyOtpRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    result = auth_service.authenticate_user(db, request.identifier, request.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifier atau password salah, atau akun dinonaktifkan.",
        )

    user, access_token, refresh_token = result

    # Set httpOnly cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
        secure=False,
    )

    role_name = user.role.name if user.role else "viewer"

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 7200,
        "user": {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "role": role_name,
        },
    }


@router.post("/refresh")
def refresh_token(
    request: Request,
    body: RefreshTokenRequest = None,
    response: Response = None,
    db: Session = Depends(get_db),
):
    token_str = (body and body.refresh_token) or request.cookies.get("refresh_token")
    if not token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token tidak ditemukan.",
        )

    result = auth_service.refresh_tokens(db, token_str)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token tidak valid atau telah kedaluwarsa.",
        )

    new_access, new_refresh, user_data = result

    if response:
        response.set_cookie(
            key="refresh_token",
            value=new_refresh,
            httponly=True,
            max_age=7 * 24 * 3600,
            samesite="lax",
            secure=False,
        )

    return {
        "access_token": new_access,
        "token_type": "bearer",
        "expires_in": 7200,
        "user": user_data,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="refresh_token")
    return {"message": "Berhasil keluar"}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    success, debug_otp = auth_service.request_password_reset(db, request.email)
    if not success:
        return {
            "message": "Jika email terdaftar, kode OTP telah dikirimkan.",
            "debug_otp": None,
        }
    return {
        "message": "Kode OTP reset password berhasil dikirim.",
        "debug_otp": debug_otp,
    }


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = auth_service.verify_and_reset_password(
        db, request.email, request.otp, request.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP tidak valid atau email tidak ditemukan.",
        )
    return {"message": "Password berhasil diubah. Silakan login kembali."}


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    success = auth_service.change_password(
        db, current_user["id"], request.old_password, request.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password lama tidak sesuai.",
        )
    return {"message": "Password berhasil diubah."}


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
