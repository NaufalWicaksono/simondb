from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User


def get_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_by_username_or_email(db: Session, identifier: str) -> Optional[User]:
    return db.query(User).filter(
        or_(User.username == identifier, User.email == identifier)
    ).first()


def get_by_role(db: Session, role_id: int) -> List[User]:
    return db.query(User).filter(User.role_id == role_id).all()


def get_paginated(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    role_id: Optional[int] = None,
) -> Tuple[List[User], int]:
    query = db.query(User)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(term),
                User.username.ilike(term),
                User.email.ilike(term),
            )
        )

    if role_id:
        query = query.filter(User.role_id == role_id)

    total = query.count()
    items = query.order_by(User.id.desc()).offset(skip).limit(limit).all()
    return items, total


def create(
    db: Session,
    name: str,
    username: str,
    email: str,
    password_hash: str,
    role_id: int,
) -> User:
    user = User(
        name=name,
        username=username,
        email=email,
        password_hash=password_hash,
        role_id=role_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update(db: Session, user: User, **fields) -> User:
    for key, value in fields.items():
        if hasattr(user, key) and value is not None:
            setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


def delete(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
