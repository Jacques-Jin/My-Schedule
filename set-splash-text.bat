@echo off
chcp 65001 >nul
echo ========================================
echo   Splash Text Editor Launcher
echo ========================================
echo.

REM Tool paths
set NODE_PATH=C:\Users\Jack\.qoder-cn\bin\node\node.exe

REM Check Node.js
if not exist "%NODE_PATH%" (
    echo [ERROR] Node.js not found: %NODE_PATH%
    pause
    exit /b 1
)

echo Starting splash text editor on http://127.0.0.1:5299/ ...
start "SplashTextEditor" "%NODE_PATH%" scripts/splash-text-editor.mjs

echo.
echo Editor window opened. Close it (or Ctrl+C) when done.
echo.
pause
