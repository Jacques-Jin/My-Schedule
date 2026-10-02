@echo off
chcp 65001 >nul
cd /d "%~dp0"

netstat -ano | findstr ":5399 " | findstr LISTENING >nul
if not errorlevel 1 (
    echo Editor already running. Opening browser...
    start http://127.0.0.1:5399/
    timeout /t 3 >nul
    exit /b 0
)

echo Starting splash text editor at http://127.0.0.1:5399/ ...
set SPLASH_EDITOR_PORT=5399
set SPLASH_TEXT_CONFIG=%~dp0app\splash-text.json
start "SplashTextEditor-Local" /min "%~dp0deno\deno.exe" run --allow-net --allow-read --allow-write --allow-run --allow-env "%~dp0server\splash-text-editor.mjs"
timeout /t 2 /nobreak >nul
start http://127.0.0.1:5399/
echo.
echo   Save in the editor, then reload http://127.0.0.1:8100/ to see it.
echo   To stop the editor: close the minimized "SplashTextEditor-Local" window.
echo.
timeout /t 5 >nul
