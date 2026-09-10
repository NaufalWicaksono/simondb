"""
app/database/session.py — Session dependency providers
"""

from typing import Generator
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Backward compatibility aliases
get_simondb_session = get_db
get_dapodik_session = get_db
