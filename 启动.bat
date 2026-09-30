@echo off
chcp 65001 >nul
echo ========================================
echo   My Schedule - Startup Launcher
echo ========================================
echo.

REM Tool paths
set DENO_PATH=C:\Users\Jack\.qoder-cn\bin\deno\deno.exe
set NODE_PATH=C:\Users\Jack\.qoder-cn\bin\node\node.exe

REM Check Deno
if not exist "%DENO_PATH%" (
    echo [ERROR] Deno not found: %DENO_PATH%
    pause
    exit /b 1
)

REM Check Node.js
if not exist "%NODE_PATH%" (
    echo [ERROR] Node.js not found: %NODE_PATH%
    pause
    exit /b 1
)

REM Guard: refuse to start if a server is already running.
REM A stale server would keep serving old data and cause a blank page.
netstat -ano | findstr ":8000 " | findstr LISTENING >nul
if not errorlevel 1 (
    echo [ERROR] Port 8000 is already in use by a running server.
    echo         Run stop.bat ^(停止.bat^) first, then start again.
    pause
    exit /b 1
)
netstat -ano | findstr ":5173 " | findstr LISTENING >nul
if not errorlevel 1 (
    echo [ERROR] Port 5173 is already in use by a running server.
    echo         Run stop.bat ^(停止.bat^) first, then start again.
    pause
    exit /b 1
)

echo [1/3] Starting API server (Deno)...
start "MySchedule-API" /min "%DENO_PATH%" run --allow-net --allow-env --allow-read functions/local-dev-index.ts

REM Wait for Deno to start
timeout /t 3 /nobreak >nul

echo [2/3] Starting frontend dev server (Vite)...
start "MySchedule-Vite" /min "%NODE_PATH%" node_modules/vite/bin/vite.js --host 127.0.0.1

REM Wait for Vite to start
timeout /t 4 /nobreak >nul

echo [3/3] Opening browser...
start http://127.0.0.1:5173/

echo.
echo ========================================
echo   All started!
echo ========================================
echo.
echo API server:   http://localhost:8000/
echo Frontend:     http://127.0.0.1:5173/
echo.
echo Tips:
echo - Servers run in minimized windows
echo - To stop: close server windows or run stop.bat
echo.
pause
