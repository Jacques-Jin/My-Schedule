@echo off
chcp 65001 >nul
echo ========================================
echo   Splash Text Editor Launcher
echo ========================================
echo.

REM Tool paths
set DENO_PATH=C:\Users\Jack\.qoder-cn\bin\deno\deno.exe

REM Check Deno
if not exist "%DENO_PATH%" (
    echo [ERROR] Deno not found: %DENO_PATH%
    pause
    exit /b 1
)

netstat -ano | findstr ":5299 " | findstr LISTENING >nul
if not errorlevel 1 (
    echo Already running. Opening browser...
    start http://127.0.0.1:5299/
    timeout /t 3 >nul
    exit /b 0
)

echo Starting splash text editor on http://127.0.0.1:5299/ ...
start "SplashTextEditor" /min "%DENO_PATH%" run --allow-net --allow-read --allow-write --allow-run --allow-env scripts/splash-text-editor.mjs
timeout /t 2 /nobreak >nul
start http://127.0.0.1:5299/

echo.
echo Editor running in a minimized window. Close it when done.
echo.
timeout /t 5 >nul
