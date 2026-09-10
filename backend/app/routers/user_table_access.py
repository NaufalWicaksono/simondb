from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database.session import get_db
from app.schemas.user_table_access import (
    BatchAccessRequest,
    UserAccessResponse,
)
from app.services import user_table_access_service

router = APIRouter(prefix="/api/user-table-access", tags=["User Table Access"])


@router.get("/{user_id}", response_model=UserAccessResponse)
def get_user_table_access(
    user_id: int,
    _current: dict = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    tables = user_table_access_service.get_user_access(db, user_id)
    return {"user_id": user_id, "tables": tables}


@router.put("/{user_id}", response_model=UserAccessResponse)
def update_user_table_access(
    user_id: int,
    request: BatchAccessRequest,
    _current: dict = Depends(require_role("admin", "super_admin")),
    db: Session = Depends(get_db),
):
    tables = user_table_access_service.set_user_tables(db, user_id, request.tables)
    return {"user_id": user_id, "tables": tables}
