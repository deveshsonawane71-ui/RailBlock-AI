@echo off
title RailBlock AI Launcher
cls
echo ======================================================================
echo           RAILBLOCK AI - SMART BLOCK PLANNING SYSTEM
echo          Indian Railways Maintenance Optimization Engine
echo ======================================================================
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo [*] Checking prerequisites...
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Python is not installed or not in PATH!
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Node.js/npm is not installed or not in PATH!
    pause
    exit /b 1
)

echo [*] Freeing ports 8000 and 5173 if currently occupied...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo [*] Starting Backend (FastAPI on http://localhost:8000)...
start "RailBlock AI - Backend" /min cmd /c "cd /d "%PROJECT_DIR%backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [*] Starting Frontend (Vite on http://localhost:5173)...
start "RailBlock AI - Frontend" /min cmd /c "cd /d "%PROJECT_DIR%frontend" && npm run dev"

echo [*] Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo [*] Opening RailBlock AI in your web browser...
start http://localhost:5173

echo.
echo ======================================================================
echo  [SUCCESS] RailBlock AI is running!
echo ======================================================================
echo.
echo  - Frontend Web UI:      http://localhost:5173
echo  - Backend API Docs:     http://localhost:8000/docs
echo  - Health Check:         http://localhost:8000/api/health
echo.
echo  (To stop all RailBlock AI servers, run stop.bat or close this window)
echo ======================================================================
echo.
pause
call "%PROJECT_DIR%stop.bat"
