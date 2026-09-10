import io
import datetime
import pandas as pd
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.session import get_db
from app.database.connection import get_all_tables, get_table_columns, parse_schema_table
from app.core.dependencies import get_current_user
from app.services.user_table_access_service import check_table_access

router = APIRouter(prefix="/api/visualisasi", tags=["Visualisasi"])

STATIC_WHITELIST = {
    "agregasi": {
        "sum": "SUM", "count": "COUNT", "avg": "AVG",
        "SUM": "SUM", "COUNT": "COUNT", "AVG": "AVG",
    },
    "urutan": {
        "asc": "ASC", "desc": "DESC",
        "Tertinggi ke Terendah": "DESC", "Terendah ke Tertinggi": "ASC",
    },
}

OPERATOR_WHITELIST = {
    "equals": "=",
    "not_equals": "<>",
    "contains": "LIKE",
    "greater_than": ">",
    "less_than": "<",
}

MAX_COLUMN_VALUES_LIMIT = 100


class FilterCondition(BaseModel):
    column: str
    operator: str = "equals"
    value: str


class DynamicChartRequest(BaseModel):
    sumber_data: str
    x_axis: str
    y_axis: str
    agregasi: str
    urutan: str
    filters: Optional[List[FilterCondition]] = None


class ColumnValuesRequest(BaseModel):
    sumber_data: str
    column: str
    search: Optional[str] = None
    limit: int = 50
    filters: Optional[List[FilterCondition]] = None


class PreviewRequest(BaseModel):
    sumber_data: str
    filters: Optional[List[FilterCondition]] = None
    search: Optional[str] = None


def _is_table_allowed(db: Session, table_name: str, role: str, user_id: int) -> bool:
    clean_table = table_name.split(".")[-1]
    all_tables = get_all_tables(db, include_internal=False)
    if clean_table not in all_tables:
        return False
    schema, tname = parse_schema_table(table_name)
    return check_table_access(db, user_id=user_id, schema_name=schema, table_name=tname, role=role)


def _build_where_clause(
    table_name: str,
    filters: Optional[List[FilterCondition]],
    valid_cols: dict,
    search: Optional[str] = None,
) -> tuple[str, dict]:
    where_parts = []
    params = {}

    clean_tbl = table_name.split(".")[-1].replace('"', '').replace("'", "").replace(";", "").strip()

    if filters:
        for idx, f in enumerate(filters):
            if f.column not in valid_cols:
                continue
            if f.operator not in OPERATOR_WHITELIST:
                continue

            clean_col = f.column.replace('"', '').replace("'", "").replace(";", "").strip()
            op = OPERATOR_WHITELIST[f.operator]
            param_key = f"filter_val_{idx}"

            if f.operator == "contains":
                where_parts.append(f'"{clean_tbl}"."{clean_col}" LIKE :{param_key}')
                params[param_key] = f"%{f.value}%"
            else:
                where_parts.append(f'"{clean_tbl}"."{clean_col}" {op} :{param_key}')
                params[param_key] = f.value

    if search:
        search_parts = []
        string_cols = [col for col, meta in valid_cols.items() if meta["category"] == "string"][:6]
        for s_idx, col in enumerate(string_cols):
            clean_col = col.replace('"', '').replace("'", "").replace(";", "").strip()
            p_key = f"search_param_{s_idx}"
            search_parts.append(f'"{clean_tbl}"."{clean_col}" LIKE :{p_key}')
            params[p_key] = f"%{search}%"
        if search_parts:
            where_parts.append(f"({' OR '.join(search_parts)})")

    clause = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    return clause, params


@router.get("/metadata/tables")
def get_metadata_tables(
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_user),
):
    all_tables = get_all_tables(db, include_internal=False)
    if current["role"] in ("super_admin", "admin"):
        return {"tables": all_tables}

    from app.services.user_table_access_service import get_user_access
    allowed = get_user_access(db, current["id"])
    if not allowed:
        return {"tables": all_tables}
    allowed_lower = {t.lower() for t in allowed}
    filtered = [t for t in all_tables if t.lower() in allowed_lower]
    return {"tables": filtered}


@router.get("/metadata/columns/{table_name}")
def get_metadata_columns(
    table_name: str,
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_user),
):
    clean_table = table_name.split(".")[-1]
    if not _is_table_allowed(db, clean_table, current["role"], current["id"]):
        raise HTTPException(status_code=403, detail="Akses tabel ditolak.")

    cols = get_table_columns(db, clean_table)
    return {
        "table": clean_table,
        "columns": [c["name"] for c in cols],
        "columns_with_meta": cols,
    }


@router.post("/column-values")
def get_column_values(
    req: ColumnValuesRequest,
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_user),
):
    clean_tbl = req.sumber_data.split(".")[-1]
    if not _is_table_allowed(db, clean_tbl, current["role"], current["id"]):
        raise HTTPException(status_code=403, detail="Akses tabel ditolak.")

    cols = get_table_columns(db, clean_tbl)
    valid_cols = {c["name"]: c for c in cols}
    if req.column not in valid_cols:
        raise HTTPException(status_code=400, detail="Kolom tidak valid.")

    clean_col = req.column.replace('"', '').replace("'", "").replace(";", "").strip()
    limit = min(req.limit, MAX_COLUMN_VALUES_LIMIT)

    where_clause, params = _build_where_clause(clean_tbl, req.filters, valid_cols)
    if req.search:
        search_cond = f'"{clean_tbl}"."{clean_col}" LIKE :search_val'
        if where_clause:
            where_clause += f" AND {search_cond}"
        else:
            where_clause = f"WHERE {search_cond}"
        params["search_val"] = f"%{req.search}%"

    query_str = (
        f'SELECT DISTINCT "{clean_col}" FROM "{clean_tbl}" '
        f'{where_clause} '
        f'AND "{clean_col}" IS NOT NULL ' if where_clause else f'WHERE "{clean_col}" IS NOT NULL '
    )
    query_str += f'ORDER BY "{clean_col}" ASC LIMIT :limit'
    params["limit"] = limit

    try:
        rows = db.execute(text(query_str), params).fetchall()
        values = [str(r[0]) for r in rows if r[0] is not None]
        return {
            "table": clean_tbl,
            "column": req.column,
            "values": values,
            "count": len(values),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/preview")
def get_preview(
    req: PreviewRequest,
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_user),
):
    clean_tbl = req.sumber_data.split(".")[-1]
    if not _is_table_allowed(db, clean_tbl, current["role"], current["id"]):
        raise HTTPException(status_code=403, detail="Akses tabel ditolak.")

    cols = get_table_columns(db, clean_tbl)
    valid_cols = {c["name"]: c for c in cols}

    where_clause, params = _build_where_clause(clean_tbl, req.filters, valid_cols, req.search)

    count_query = f'SELECT COUNT(*) FROM "{clean_tbl}" {where_clause}'
    sample_query = f'SELECT * FROM "{clean_tbl}" {where_clause} LIMIT 10'

    try:
        total_rows = db.execute(text(count_query), params).scalar() or 0
        sample_rows_raw = db.execute(text(sample_query), params).fetchall()

        col_names = [c["name"] for c in cols]
        sample_rows = [dict(zip(col_names, r)) for r in sample_rows_raw]

        return {
            "sumber_data": clean_tbl,
            "row_count": total_rows,
            "sample_rows": sample_rows,
            "columns": col_names,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/dynamic-chart")
def get_dynamic_chart(
    req: DynamicChartRequest,
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_user),
):
    clean_tbl = req.sumber_data.split(".")[-1]
    if not _is_table_allowed(db, clean_tbl, current["role"], current["id"]):
        raise HTTPException(status_code=403, detail="Akses tabel ditolak.")

    cols = get_table_columns(db, clean_tbl)
    valid_cols = {c["name"]: c for c in cols}

    if req.x_axis not in valid_cols or req.y_axis not in valid_cols:
        raise HTTPException(status_code=400, detail="Kolom X atau Y tidak valid.")

    agg = STATIC_WHITELIST["agregasi"].get(req.agregasi, "COUNT")
    order = STATIC_WHITELIST["urutan"].get(req.urutan, "DESC")

    clean_x = req.x_axis.replace('"', '').replace("'", "").replace(";", "").strip()
    clean_y = req.y_axis.replace('"', '').replace("'", "").replace(";", "").strip()

    where_clause, params = _build_where_clause(clean_tbl, req.filters, valid_cols)

    query_str = (
        f'SELECT "{clean_x}" AS label, {agg}(CAST("{clean_y}" AS REAL)) AS value '
        f'FROM "{clean_tbl}" '
        f'{where_clause} '
        f'GROUP BY "{clean_x}" '
        f'ORDER BY value {order} '
        f'LIMIT 50'
    )

    try:
        rows = db.execute(text(query_str), params).fetchall()
        labels = [str(r[0]) if r[0] is not None else "N/A" for r in rows]
        values = [round(float(r[1]), 2) if r[1] is not None else 0 for r in rows]

        return {
            "labels": labels,
            "datasets": [{
                "label": f"{agg} of {req.y_axis}",
                "data": values,
                "backgroundColor": "#3b82f6",
            }],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/export-excel")
def export_excel(
    req: PreviewRequest,
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_user),
):
    clean_tbl = req.sumber_data.split(".")[-1]
    if not _is_table_allowed(db, clean_tbl, current["role"], current["id"]):
        raise HTTPException(status_code=403, detail="Akses tabel ditolak.")

    cols = get_table_columns(db, clean_tbl)
    valid_cols = {c["name"]: c for c in cols}

    where_clause, params = _build_where_clause(clean_tbl, req.filters, valid_cols, req.search)
    query_str = f'SELECT * FROM "{clean_tbl}" {where_clause} LIMIT 10000'

    try:
        rows = db.execute(text(query_str), params).fetchall()
        col_names = [c["name"] for c in cols]
        df = pd.DataFrame(rows, columns=col_names)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name=clean_tbl[:31])
        output.seek(0)

        filename = f"export_{clean_tbl}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
