@echo off
echo ========================================
echo   我的日程 - 启动器
echo ========================================
echo.

REM 设置路径
set DENO_PATH=C:\Users\Jack\.qoder-cn\bin\deno\deno.exe
set NODE_PATH=C:\Users\Jack\.qoder-cn\bin\node\node.exe

REM 检查 Deno
if not exist "%DENO_PATH%" (
    echo [错误] 未找到 Deno: %DENO_PATH%
    pause
    exit /b 1
)

REM 检查 Node.js
if not exist "%NODE_PATH%" (
    echo [错误] 未找到 Node.js: %NODE_PATH%
    pause
    exit /b 1
)

echo [1/3] 启动本地 API 服务器 (Deno)...
start "我的日程-API" /min "%DENO_PATH%" run --allow-net --allow-env functions/local-dev-index.ts

REM 等待 Deno 服务器启动
timeout /t 3 /nobreak >/dev/null

echo [2/3] 启动前端开发服务器 (Vite)...
start "我的日程-Vite" /min "%NODE_PATH%" node_modules/vite/bin/vite.js --host 127.0.0.1

REM 等待 Vite 服务器启动
timeout /t 4 /nobreak >/dev/null

echo [3/3] 打开浏览器...
start http://127.0.0.1:5173/

echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo API 服务器：http://localhost:8000/
echo 前端应用：  http://127.0.0.1:5173/
echo.
echo 提示：
echo - 两个服务器窗口已最小化到任务栏
echo - 关闭服务器：点击任务栏图标，按 Ctrl+C
echo - 重启程序：关闭所有窗口后重新运行此脚本
echo.
pause
