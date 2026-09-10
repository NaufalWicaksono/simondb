from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.models.export_history import ExportHistory
from app.repositories import export_history_repository


def log_export(
    db: Session,
    user_id: int,
    table_name: str,
    format: str = "xlsx",
    row_count: Optional[int] = None,
    file_name: Optional[str] = None,
    filters_applied: Optional[str] = None,
    columns_exported: Optional[str] = None,
) -> ExportHistory:
    return export_history_repository.create(
        db,
        user_id=user_id,
        table_name=table_name,
        format=format,
        row_count=row_count,
        file_name=file_name,
        filters_applied=filters_applied,
        columns_exported=columns_exported,
    )


def list_export_history(
    db: Session,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
) -> Tuple[List[ExportHistory], int]:
    return export_history_repository.get_paginated(db, user_id=user_id, skip=skip, limit=limit)
