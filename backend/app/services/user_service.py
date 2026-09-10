from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.user import User
from app.repositories import user_repository, role_repository


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return user_repository.get_by_id(db, user_id)


def list_users(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    role_id: Optional[int] = None,
) -> Tuple[List[User], int]:
    return user_repository.get_paginated(db, skip=skip, limit=limit, search=search, role_id=role_id)


def create_user(
    db: Session,
    name: str,
    username: str,
    email: str,
    password: str,
    role_id: int,
) -> Tuple[Optional[User], Optional[str]]:
    if user_repository.get_by_username(db, username):
        return None, f"Username '{username}' sudah digunakan."

    if user_repository.get_by_email(db, email):
        return None, f"Email '{email}' sudah terdaftar."

    role = role_repository.get_by_id(db, role_id)
    if not role:
        return None, "Role tidak valid."

    user = user_repository.create(
        db,
        name=name,
        username=username,
        email=email,
        password_hash=hash_password(password),
        role_id=role_id,
    )
    return user, None


def update_user(
    db: Session,
    user_id: int,
    name: Optional[str] = None,
    email: Optional[str] = None,
    role_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    password: Optional[str] = None,
) -> Tuple[Optional[User], Optional[str]]:
    user = user_repository.get_by_id(db, user_id)
    if not user:
        return None, "User tidak ditemukan."

    if email and email != user.email:
        if user_repository.get_by_email(db, email):
            return None, f"Email '{email}' sudah digunakan."

    if role_id:
        if not role_repository.get_by_id(db, role_id):
            return None, "Role tidak valid."

    fields = {}
    if name is not None:
        fields["name"] = name
    if email is not None:
        fields["email"] = email
    if role_id is not None:
        fields["role_id"] = role_id
    if is_active is not None:
        fields["is_active"] = is_active
    if password:
        fields["password_hash"] = hash_password(password)

    updated = user_repository.update(db, user, **fields)
    return updated, None


def delete_user(db: Session, user_id: int) -> Tuple[bool, Optional[str]]:
    user = user_repository.get_by_id(db, user_id)
    if not user:
        return False, "User tidak ditemukan."

    if user.role and user.role.name == "super_admin":
        super_admins = user_repository.get_by_role(db, user.role_id)
        if len(super_admins) <= 1:
            return False, "Tidak dapat menghapus Super Admin terakhir."

    user_repository.delete(db, user)
    return True, None
