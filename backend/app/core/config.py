"""
app/core/config.py — Application Configuration (SQLite Standalone)
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── SQLite Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./simondb.sqlite"

    # ─── Bootstrap Super Admin ───────────────────────────────────────────────
    SUPER_ADMIN_NAME: str = "Super Admin Demo"
    SUPER_ADMIN_USERNAME: str = "superadmin"
    SUPER_ADMIN_EMAIL: str = "admin@simondb.demo"
    SUPER_ADMIN_PASSWORD: str = "Admin123!"

    # ─── JWT Security ─────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "simondb_demo_super_secret_jwt_key_2026_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 120
    JWT_REFRESH_EXPIRE_HOURS: int = 168
    OTP_EXPIRE_MINUTES: int = 10

    # ─── App Settings ─────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"

    # ─── SMTP (Optional) ──────────────────────────────────────────────────────
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""


settings = Settings()
