@echo off
chcp 65001 >nul
echo ========================================
echo   My Schedule - Stop Launcher
echo ========================================
echo.

echo Finding and stopping servers...
echo.

set found_any=0

REM Kill all processes listening on port 8000
echo [PORT 8000] Scanning...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":8000 "') do (
    if not "%%a"=="0" (
        echo   [STOP] Killing PID %%a
        taskkill /F /PID %%a >nul 2>nul && set found_any=1
    )
)

REM Kill all processes listening on port 5173
echo [PORT 5173] Scanning...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5173 "') do (
    if not "%%a"=="0" (
        echo   [STOP] Killing PID %%a
        taskkill /F /PID %%a >nul 2>nul && set found_any=1
    )
)

if %found_any%==0 (
    echo   No servers found running on port 8000 or 5173.
) else (
    echo.
    echo   Done. Ports 8000 and 5173 are now free.
)

echo.
echo ========================================
echo   All servers stopped
echo ========================================
echo.
pause
