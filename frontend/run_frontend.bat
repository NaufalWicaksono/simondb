@echo off
title SiMonDB Demo - Frontend (Vite)
echo ========================================================
echo Starting SiMonDB Enterprise Demo Frontend (Vite + React)...
echo ========================================================

REM Check if node is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found in PATH. Please install Node.js 18+
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo [INFO] node_modules not found. Running npm install...
    call npm install
)

echo [INFO] Starting Vite dev server on http://localhost:5177 ...
call npm run dev
pause
