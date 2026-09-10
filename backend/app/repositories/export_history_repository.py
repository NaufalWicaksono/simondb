from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.export_history import ExportHistory


def create(
    db: Session,
    user_id: int,
    table_name: str,
    format: str = "xlsx",
    row_count: Optional[int] = None,
    file_name: Optional[str] = None,
    filters_applied: Optional[str] = None,
    columns_exported: Optional[str] = None,
) -> ExportHistory:
    history = ExportHistory(
        user_id=user_id,
        table_name=table_name,
        format=format,
        row_count=row_count,
        file_name=file_name,
        filters_applied=filters_applied,
        columns_exported=columns_exported,
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def get_paginated(
    db: Session,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
) -> Tuple[List[ExportHistory], int]:
    query = db.query(ExportHistory)
    if user_id:
        query = query.filter(ExportHistory.user_id == user_id)

    total = query.count()
    items = query.order_by(ExportHistory.created_at.desc()).offset(skip).limit(limit).all()
    return items, total
