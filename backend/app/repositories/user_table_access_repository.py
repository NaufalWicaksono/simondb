from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.user_table_access import UserTableAccess


def get_by_user_id(db: Session, user_id: int) -> List[UserTableAccess]:
    return db.query(UserTableAccess).filter(UserTableAccess.user_id == user_id).all()


def get_by_user_schema_table(
    db: Session,
    user_id: int,
    schema_name: str,
    table_name: str,
) -> Optional[UserTableAccess]:
    return (
        db.query(UserTableAccess)
        .filter(
            UserTableAccess.user_id == user_id,
            UserTableAccess.schema_name == schema_name,
            UserTableAccess.table_name == table_name,
        )
        .first()
    )


def grant_access(db: Session, user_id: int, schema_name: str, table_name: str) -> UserTableAccess:
    existing = get_by_user_schema_table(db, user_id, schema_name, table_name)
    if existing:
        return existing

    access = UserTableAccess(
        user_id=user_id,
        schema_name=schema_name,
        table_name=table_name,
    )
    db.add(access)
    db.commit()
    db.refresh(access)
    return access


def revoke_access(db: Session, user_id: int, schema_name: str, table_name: str) -> bool:
    access = get_by_user_schema_table(db, user_id, schema_name, table_name)
    if not access:
        return False
    db.delete(access)
    db.commit()
    return True


def replace_user_access(
    db: Session,
    user_id: int,
    table_list: List[str],
) -> List[UserTableAccess]:
    db.query(UserTableAccess).filter(UserTableAccess.user_id == user_id).delete()

    created = []
    for full_name in table_list:
        parts = full_name.split(".", 1)
        schema = parts[0] if len(parts) == 2 else "main"
        table = parts[1] if len(parts) == 2 else parts[0]

        access = UserTableAccess(user_id=user_id, schema_name=schema, table_name=table)
        db.add(access)
        created.append(access)

    db.commit()
    return created
