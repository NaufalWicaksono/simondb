from typing import List
from sqlalchemy.orm import Session
from app.repositories import user_table_access_repository


def get_user_access(db: Session, user_id: int) -> List[str]:
    records = user_table_access_repository.get_by_user_id(db, user_id)
    return [r.table_name for r in records]


def check_table_access(
    db: Session,
    user_id: int,
    schema_name: str,
    table_name: str,
    role: str,
) -> bool:
    if role in ("super_admin", "admin"):
        return True

    # If user has no specific restrictions set, allow all public tables
    records = user_table_access_repository.get_by_user_id(db, user_id)
    if not records:
        return True

    access = user_table_access_repository.get_by_user_schema_table(
        db, user_id=user_id, schema_name=schema_name, table_name=table_name
    )
    return access is not None


def set_user_tables(db: Session, user_id: int, tables: List[str]) -> List[str]:
    created = user_table_access_repository.replace_user_access(db, user_id, tables)
    return [r.table_name for r in created]
