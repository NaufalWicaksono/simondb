import io
import datetime
import pandas as pd
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.session import get_db
from app.database.connection import get_all_tables, get_table_columns, parse_schema_table
from app.core.dependencies import get_current_user
from app.services import export_history_service, user_table_access_service

router = APIRouter(tags=["Import / Export"])


class ExportRequest(BaseModel):
    columns: Optional[List[str]] = None
    filters: Optional[List[dict]] = None


@router.post("/api/export/{table_name}")
def export_table_data(
    table_name: str,
    req: ExportRequest,
    format: str = Query("xlsx"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    clean_tbl = table_name.split(".")[-1]
    all_tables = get_all_tables(db)
    if clean_tbl not in all_tables:
        raise HTTPException(status_code=404, detail="Tabel tidak ditemukan.")

    cols_meta = get_table_columns(db, clean_tbl)
    all_col_names = [c["name"] for c in cols_meta]

    selected_cols = req.columns if req.columns else all_col_names
    for col in selected_cols:
        if col not in all_col_names:
            raise HTTPException(status_code=400, detail=f"Kolom {col} tidak valid.")

    cols_str = ", ".join([f'"{c}"' for c in selected_cols])
    query_str = f'SELECT {cols_str} FROM "{clean_tbl}" LIMIT 50000'

    rows = db.execute(text(query_str)).fetchall()
    df = pd.DataFrame(rows, columns=selected_cols)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"export_{clean_tbl}_{timestamp}.{format}"

    # Log export history
    export_history_service.log_export(
        db,
        user_id=current_user["id"],
        table_name=clean_tbl,
        format=format,
        row_count=len(df),
        file_name=file_name,
        columns_exported=", ".join(selected_cols),
    )

    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
        )
    else:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name=clean_tbl[:31])
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
        )


@router.post("/api/export/{table_name}/preview")
def preview_table_data(
    table_name: str,
    req: ExportRequest,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _current: dict = Depends(get_current_user),
):
    clean_tbl = table_name.split(".")[-1]
    all_tables = get_all_tables(db, include_internal=False)
    if clean_tbl not in all_tables:
        raise HTTPException(status_code=404, detail="Tabel tidak ditemukan.")
    cols_meta = get_table_columns(db, clean_tbl)
    col_names = [c["name"] for c in cols_meta]

    query_str = f'SELECT * FROM "{clean_tbl}" LIMIT :limit'
    rows = db.execute(text(query_str), {"limit": limit}).fetchall()
    row_count = db.execute(text(f'SELECT COUNT(*) FROM "{clean_tbl}"')).scalar() or 0

    return {
        "table": clean_tbl,
        "columns": col_names,
        "rows": [dict(zip(col_names, r)) for r in rows],
        "row_count": row_count,
        "limit": limit,
    }


@router.get("/api/import-export/template/{table_name}")
def download_template(
    table_name: str,
    db: Session = Depends(get_db),
    _current: dict = Depends(get_current_user),
):
    clean_tbl = table_name.split(".")[-1]
    cols_meta = get_table_columns(db, clean_tbl)
    col_names = [c["name"] for c in cols_meta if c["name"].lower() not in ("id", "created_at", "updated_at")]

    df = pd.DataFrame(columns=col_names)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Template")
    output.seek(0)

    filename = f"template_{clean_tbl}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
