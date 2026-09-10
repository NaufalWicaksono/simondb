"""
app/main.py — FastAPI Application Entry Point (SiMonDB Demo)
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import hash_password
from app.database.connection import engine, SessionLocal
from app.models.base import Base
from app.routers import (
    auth as auth_router,
    users as users_router,
    invitations as invitations_router,
    user_table_access as user_table_access_router,
    export_history as export_history_router,
    facility_operations as facility_operations_router,
    dashboard as dashboard_router,
    visualisasi as visualisasi_router,
    import_export as import_export_router,
    status as status_router,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Create SQLite Tables ─────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="SiMonDB Enterprise Demo API",
    description=(
        "**Sistem Monitoring Operasional & Logistik Terdistribusi (SiMonDB Demo)**.\n\n"
        "Mendukung visualisasi analitik dinamis, geospasial sebaran fasilitas di 38 provinsi di Indonesia, "
        "manajemen akses pengguna multi-role, dan ekspor data interaktif dengan database SQLite mandiri."
    ),
    version="2.0.0-demo",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5177",
        "http://127.0.0.1:5177",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(invitations_router.router)
app.include_router(user_table_access_router.router)
app.include_router(export_history_router.router)
app.include_router(facility_operations_router.router)
app.include_router(dashboard_router.router)
app.include_router(visualisasi_router.router)
app.include_router(import_export_router.router)
app.include_router(status_router.router)


# ─── Startup Event ────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    logger.info("=" * 60)
    logger.info("SiMonDB Enterprise Demo API v2.0.0 — Starting up...")
    logger.info("=" * 60)

    db = SessionLocal()
    try:
        _seed_roles(db)
        _bootstrap_super_admin(db)
    except Exception as exc:
        logger.error(f"[startup] Error on startup: {exc}", exc_info=True)
    finally:
        db.close()


def _seed_roles(db) -> None:
    from app.repositories import role_repository
    role_repository.seed_roles(db)


def _bootstrap_super_admin(db) -> None:
    from app.repositories import user_repository, role_repository

    super_admin_role = role_repository.get_by_name(db, "super_admin")
    if not super_admin_role:
        return

    existing_admins = user_repository.get_by_role(db, super_admin_role.id)
    if existing_admins:
        return

    hashed_password = hash_password(settings.SUPER_ADMIN_PASSWORD)
    user_repository.create(
        db,
        name=settings.SUPER_ADMIN_NAME,
        username=settings.SUPER_ADMIN_USERNAME,
        email=settings.SUPER_ADMIN_EMAIL,
        password_hash=hashed_password,
        role_id=super_admin_role.id,
    )
    logger.info(f"[startup] ✓ Super Admin created: {settings.SUPER_ADMIN_EMAIL}")


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": "SiMonDB Demo API", "version": "2.0.0-demo"}


@app.get("/", tags=["System"])
def root():
    return {
        "message": "SiMonDB Enterprise Demo API aktif. Kunjungi /docs untuk dokumentasi Swagger.",
        "docs": "/docs",
        "health": "/health",
    }
