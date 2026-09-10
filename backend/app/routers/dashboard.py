"""
app/routers/dashboard.py — Dashboard Statistics (SQLite Native)
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from cachetools import TTLCache

from app.core.dependencies import get_current_user, require_role
from app.database.session import get_db
from app.database.connection import get_all_tables, get_table_columns
from app.services import user_table_access_service

logger = logging.getLogger(__name__)

# In-memory cache for dashboard stats (TTL 5 minutes)
_stats_cache = TTLCache(maxsize=10, ttl=300)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

_TOP_N_CATEGORICAL = 10
_MAX_TABLES_DETAIL = 20


def _safe_count(db: Session, table: str) -> int:
    try:
        clean = table.replace('"', '').replace("'", "").replace(";", "").strip()
        result = db.execute(text(f'SELECT COUNT(*) FROM "{clean}"')).fetchone()
        return int(result[0]) if result else 0
    except Exception as exc:
        logger.warning(f"[dashboard] COUNT failed for {table}: {exc}")
        return 0


def _get_first_categorical_column(db: Session, table: str) -> str | None:
    cols = get_table_columns(db, table)
    for c in cols:
        if c["category"] == "string" and c["name"].lower() not in ("id", "created_at", "updated_at"):
            return c["name"]
    return cols[0]["name"] if cols else None


def _get_categorical_distribution(db: Session, table: str, column: str, top_n: int = _TOP_N_CATEGORICAL) -> list[dict]:
    try:
        clean_tbl = table.replace('"', '').replace("'", "").replace(";", "").strip()
        clean_col = column.replace('"', '').replace("'", "").replace(";", "").strip()
        query = text(
            f'SELECT "{clean_col}", COUNT(*) AS jumlah '
            f'FROM "{clean_tbl}" '
            f'WHERE "{clean_col}" IS NOT NULL '
            f'GROUP BY "{clean_col}" ORDER BY jumlah DESC LIMIT :top_n'
        )
        rows = db.execute(query, {"top_n": top_n}).fetchall()
        return [{"label": str(r[0]) if r[0] is not None else "N/A", "jumlah": int(r[1])} for r in rows]
    except Exception as exc:
        logger.warning(f"[dashboard] Distribution failed for {column} in {table}: {exc}")
        return []


def _get_numeric_summary(db: Session, table: str) -> list[dict]:
    try:
        cols = get_table_columns(db, table)
        numeric_cols = [c["name"] for c in cols if c["category"] == "numeric"][:5]
        if not numeric_cols:
            return []

        clean_tbl = table.replace('"', '').replace("'", "").replace(";", "").strip()
        summaries = []
        for col_name in numeric_cols:
            clean_col = col_name.replace('"', '').replace("'", "").replace(";", "").strip()
            try:
                row = db.execute(
                    text(
                        f'SELECT MIN(CAST("{clean_col}" AS REAL)), '
                        f'       MAX(CAST("{clean_col}" AS REAL)), '
                        f'       AVG(CAST("{clean_col}" AS REAL)) '
                        f'FROM "{clean_tbl}"'
                    )
                ).fetchone()
                if row and row[0] is not None:
                    summaries.append({
                        "column": col_name,
                        "min": round(float(row[0]), 2),
                        "max": round(float(row[1]), 2),
                        "avg": round(float(row[2]), 2),
                    })
            except Exception:
                pass
        return summaries
    except Exception as exc:
        logger.warning(f"[dashboard] Numeric summary failed for {table}: {exc}")
        return []


@router.get("/tables")
def get_accessible_tables(
    db: Session = Depends(get_db),
    current: dict = Depends(get_current_user),
):
    all_tables = get_all_tables(db)

    if current["role"] in ("super_admin", "admin"):
        return {"tables": all_tables, "total": len(all_tables), "role": current["role"]}

    allowed = user_table_access_service.get_user_access(db, current["user_id"])
    allowed_lower = {t.lower() for t in allowed}
    filtered = [t for t in all_tables if t.lower() in allowed_lower]

    return {"tables": filtered, "total": len(filtered), "role": current["role"]}


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _current: dict = Depends(get_current_user),
):
    cache_key = "dashboard_stats"
    if cache_key in _stats_cache:
        return _stats_cache[cache_key]

    try:
        all_tables = get_all_tables(db)
        if not all_tables:
            return {
                "summary": {"total_tables": 0, "total_rows_all_tables": 0, "tables": []},
                "charts": {"categorical_distribution": None, "numeric_summary": []},
                "meta": {"note": "Tidak ada tabel di SQLite database."},
            }

        tables_detail = []
        total_rows = 0
        for table in all_tables[:_MAX_TABLES_DETAIL]:
            count = _safe_count(db, table)
            total_rows += count
            tables_detail.append({
                "name": table,
                "schema": "main",
                "table": table,
                "row_count": count,
            })

        tables_detail.sort(key=lambda x: x["row_count"], reverse=True)

        categorical_chart = None
        if tables_detail:
            largest = tables_detail[0]
            cat_col = _get_first_categorical_column(db, largest["table"])
            if cat_col:
                dist_data = _get_categorical_distribution(db, largest["table"], cat_col)
                if dist_data:
                    categorical_chart = {"table": largest["name"], "column": cat_col, "data": dist_data}

        numeric_summary = []
        if tables_detail:
            largest = tables_detail[0]
            numeric_summary = _get_numeric_summary(db, largest["table"])

        result = {
            "summary": {
                "total_tables": len(all_tables),
                "total_rows_all_tables": total_rows,
                "tables": tables_detail,
            },
            "charts": {
                "categorical_distribution": categorical_chart,
                "numeric_summary": numeric_summary,
            },
            "meta": {
                "note": f"Database SQLite terhubung dengan {len(all_tables)} tabel aktif.",
            },
        }
        _stats_cache[cache_key] = result
        return result
    except Exception as exc:
        logger.error(f"[dashboard/stats] Error: {exc}", exc_info=True)
        return {
            "summary": {"total_tables": 0, "total_rows_all_tables": 0, "tables": []},
            "charts": {"categorical_distribution": None, "numeric_summary": []},
            "meta": {"note": f"Terjadi kesalahan saat memuat statistik: {str(exc)}"},
        }


@router.get("/debug-schemas")
def debug_schemas(
    db: Session = Depends(get_db),
    _current: dict = Depends(require_role("admin", "super_admin")),
):
    tables = get_all_tables(db)
    return {
        "database": "SQLite Standalone",
        "discovered_count": len(tables),
        "discovered_tables": tables,
    }
