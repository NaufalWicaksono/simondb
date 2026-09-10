"""
app/database/connection.py — SQLite Engine & Session Configuration
"""

import os
import logging
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

# Connect args for SQLite
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

# Enable Foreign Key support in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Backward compatibility aliases
engine_simondb = engine
engine_dapodik = engine
SessionSimondb = SessionLocal
SessionDapodik = SessionLocal


# Internal system & auth tables that should never be exposed in public/analytics queries
SYSTEM_INTERNAL_TABLES = {
    "users",
    "roles",
    "refresh_tokens",
    "otp_codes",
    "invitation_tokens",
    "user_table_access",
    "export_history",
    "revit_import_history",
}


def get_all_tables(db, include_internal: bool = False) -> list[str]:
    """
    Returns public/operational tables in SQLite database.
    Excludes internal system/auth metadata tables (refresh_tokens, otp_codes, users, etc.) by default.
    """
    try:
        query = text(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' "
            "AND name NOT LIKE 'sqlite_%' "
            "AND name NOT IN ('alembic_version') "
            "ORDER BY name"
        )
        rows = db.execute(query).fetchall()
        all_tables = [row[0] for row in rows]
        if include_internal:
            return all_tables
        return [t for t in all_tables if t.lower() not in SYSTEM_INTERNAL_TABLES]
    except Exception as exc:
        logger.error(f"[get_all_tables] Failed to discover tables: {exc}")
        return []


def get_table_columns(db, table_name: str) -> list[dict]:
    """
    Returns column metadata for table: [{'name': col_name, 'type': col_type, 'category': 'string'|'numeric'|'date'}]
    """
    try:
        # Sanitize table name to prevent injection
        clean_table = table_name.replace('"', '').replace("'", '').replace(";", "").strip()
        query = text(f'PRAGMA table_info("{clean_table}")')
        rows = db.execute(query).fetchall()
        
        cols = []
        for r in rows:
            # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
            col_name = str(r[1])
            col_type = str(r[2]).upper()
            
            category = "string"
            if any(num in col_type for num in ["INT", "FLOAT", "DOUBLE", "REAL", "NUMERIC", "DECIMAL"]):
                category = "numeric"
            elif any(d in col_type for d in ["DATE", "TIME", "TIMESTAMP"]):
                category = "date"
                
            cols.append({
                "name": col_name,
                "type": col_type or "TEXT",
                "category": category
            })
        return cols
    except Exception as exc:
        logger.error(f"[get_table_columns] Failed for table {table_name}: {exc}")
        return []


def parse_schema_table(table_str: str) -> tuple[str, str]:
    """
    Parse string 'table' or 'schema.table' -> (schema, table).
    For SQLite, default schema is 'main'.
    """
    parts = table_str.strip().split(".")
    if len(parts) == 2:
        return parts[0], parts[1]
    return "main", parts[0]
