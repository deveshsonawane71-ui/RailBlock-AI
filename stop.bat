@echo off
title Stopping RailBlock AI
echo [*] Stopping RailBlock AI services...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo [*] RailBlock AI services have been stopped.
timeout /t 2 /nobreak >nul
