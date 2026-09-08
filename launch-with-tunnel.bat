@echo off
title RailBlock AI Launcher (With Public URL)
cls
echo ======================================================================
echo       RAILBLOCK AI - LAUNCH WITH PUBLIC SHAREABLE URL
echo ======================================================================
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo [*] Starting Backend (FastAPI on port 8000)...
start "RailBlock AI - Backend" /min cmd /c "cd /d "%PROJECT_DIR%backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [*] Starting Frontend (Vite on port 5173)...
start "RailBlock AI - Frontend" /min cmd /c "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo [*] Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo [*] Opening Local Browser...
start http://localhost:5173

echo.
echo ======================================================================
echo  Creating Public Shareable HTTPS URL...
echo  (Keep this window open to maintain the public connection)
echo ======================================================================
echo.
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:5173 serveo.net

echo.
pause
call "%PROJECT_DIR%stop.bat"
