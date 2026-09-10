from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.schemas.export_history import ExportHistoryListResponse, ExportHistoryResponse
from app.services import export_history_service

router = APIRouter(prefix="/api/export-history", tags=["Export History"])


@router.get("", response_model=ExportHistoryListResponse)
def get_export_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    user_id = None if current_user["role"] in ("admin", "super_admin") else current_user["id"]

    items, total = export_history_service.list_export_history(
        db, user_id=user_id, skip=skip, limit=limit
    )

    result_items = []
    for item in items:
        user_name = item.user.name if item.user else "Unknown"
        result_items.append(
            ExportHistoryResponse(
                id=item.id,
                user_id=item.user_id,
                user_name=user_name,
                table_name=item.table_name,
                format=item.format,
                row_count=item.row_count,
                file_name=item.file_name,
                created_at=item.created_at,
            )
        )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": result_items,
    }
