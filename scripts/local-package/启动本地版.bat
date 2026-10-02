@echo off
chcp 65001 >nul
cd /d "%~dp0"
title My Schedule Local Edition

netstat -ano | findstr ":8100 " | findstr LISTENING >nul
if not errorlevel 1 (
    echo Already running. Opening browser...
    start http://127.0.0.1:8100/
    timeout /t 3 >nul
    exit /b 0
)

echo Starting My Schedule Local Edition...
start "MySchedule-Local-Server" /min "%~dp0deno\deno.exe" run --allow-net --allow-read --allow-env "%~dp0server\server.ts"
timeout /t 2 /nobreak >nul
start http://127.0.0.1:8100/

echo.
echo   Running at http://127.0.0.1:8100/
echo   To stop: close the minimized "MySchedule-Local-Server" window,
echo            or run stop-local.bat
echo.
timeout /t 5 >nul
