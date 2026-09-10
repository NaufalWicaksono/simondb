import os
import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.session import get_db

router = APIRouter(prefix="/api/status", tags=["System Status"])


@router.get("")
def get_system_status(db: Session = Depends(get_db)):
    t0 = time.perf_counter()
    db_connected = False
    table_count = 0
    try:
        res = db.execute(text("SELECT count(*) FROM sqlite_master WHERE type='table'")).scalar()
        table_count = int(res or 0)
        db_connected = True
    except Exception:
        db_connected = False
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    return {
        "status": "healthy" if db_connected else "degraded",
        "timestamp": time.time(),
        "database": {
            "type": "SQLite Standalone",
            "connected": db_connected,
            "latency_ms": latency_ms,
            "table_count": table_count,
        },
        "version": "2.0.0-demo",
    }
