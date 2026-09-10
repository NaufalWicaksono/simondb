from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database.session import get_db
from app.schemas.user import UserResponse, UserListResponse, CreateUserRequest, UpdateUserRequest
from app.services import user_service
from app.repositories import role_repository

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role_id: Optional[int] = Query(None),
    _current: dict = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    users, total = user_service.list_users(db, skip=skip, limit=limit, search=search, role_id=role_id)
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": users,
    }


@router.get("/roles")
def get_roles(
    _current: dict = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    return role_repository.get_all(db)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: CreateUserRequest,
    _current: dict = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    user, error = user_service.create_user(
        db,
        name=request.name,
        username=request.username,
        email=request.email,
        password=request.password,
        role_id=request.role_id,
    )
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    request: UpdateUserRequest,
    _current: dict = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    user, error = user_service.update_user(
        db,
        user_id=user_id,
        name=request.name,
        email=request.email,
        role_id=request.role_id,
        is_active=request.is_active,
        password=request.password,
    )
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    _current: dict = Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    success, error = user_service.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    return {"message": "User berhasil dihapus"}
