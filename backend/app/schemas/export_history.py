from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class ExportHistoryResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    table_name: str
    format: str
    row_count: Optional[int] = None
    file_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExportHistoryListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[ExportHistoryResponse]
