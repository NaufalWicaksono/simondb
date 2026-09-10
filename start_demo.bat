@echo off
title SiMonDB Demo Launcher
echo ==============================================================================
echo             SiMonDB Enterprise Demo — All-in-One Launcher
echo       (FastAPI SQLite Backend on :8000 & Vite React Frontend on :5173)
echo ==============================================================================
echo.

echo [1/2] Launching Backend Server in new window...
start "SiMonDB Backend (FastAPI + SQLite)" cmd /k "cd backend && run_backend.bat"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Frontend Server in new window...
start "SiMonDB Frontend (React + Vite)" cmd /k "cd frontend && run_frontend.bat"

echo.
echo ==============================================================================
echo Services started!
echo - Backend API Docs : http://localhost:8000/docs
echo - Frontend Web App : http://localhost:5177
echo.
echo Default Super Admin Credentials:
echo - Email    : admin@simondb.demo
echo - Password : Admin123!
echo ==============================================================================
echo.
pause
