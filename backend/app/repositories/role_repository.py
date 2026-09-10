from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.role import Role

DEFAULT_ROLES = [
    {"name": "super_admin", "description": "Super Administrator — Full system and data access"},
    {"name": "admin", "description": "Administrator — Manage users, access rights, and operations"},
    {"name": "viewer", "description": "Viewer — Read-only access to assigned analytics tables"},
]


def seed_roles(db: Session) -> None:
    for role_data in DEFAULT_ROLES:
        existing = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing:
            new_role = Role(name=role_data["name"], description=role_data["description"])
            db.add(new_role)
    db.commit()


def get_by_name(db: Session, name: str) -> Optional[Role]:
    return db.query(Role).filter(Role.name == name).first()


def get_by_id(db: Session, role_id: int) -> Optional[Role]:
    return db.query(Role).filter(Role.id == role_id).first()


def get_all(db: Session) -> List[Role]:
    return db.query(Role).order_by(Role.id).all()
