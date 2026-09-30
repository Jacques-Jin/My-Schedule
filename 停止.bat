@echo off
chcp 65001 >nul
echo ========================================
echo   My Schedule - Stop Launcher
echo ========================================
echo.

echo Finding and stopping servers...
echo.

REM Find and stop Deno server (port 8000)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo [STOP] Deno server (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

REM Find and stop Vite server (port 5173)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo [STOP] Vite server (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo ========================================
echo   All servers stopped
echo ========================================
echo.
pause
