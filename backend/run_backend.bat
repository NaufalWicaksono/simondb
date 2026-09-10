@echo off
title SiMonDB Demo - Backend FastAPI (SQLite)
echo ========================================================
echo Starting SiMonDB Enterprise Demo Backend (FastAPI + SQLite)...
echo ========================================================

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found in PATH. Please install Python 3.10+
    pause
    exit /b 1
)

REM Initialize/Seed database if not exists
if not exist simondb.sqlite (
    echo [INFO] Database not found. Initializing and seeding demo data...
    python seed_demo_data.py
)

echo [INFO] Starting FastAPI server on http://localhost:8000 ...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
