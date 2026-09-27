@echo off
chcp 65001 >nul
echo ========================================
echo   我的日程 - 停止服务器
echo ========================================
echo.

echo 正在查找并停止服务器进程...
echo.

REM 查找并停止 Deno 进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo [停止] Deno 服务器 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

REM 查找并停止 Vite 进程 (默认端口 5173)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo [停止] Vite 服务器 (PID: %%a)
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo ========================================
echo   服务器已停止
echo ========================================
echo.
pause
