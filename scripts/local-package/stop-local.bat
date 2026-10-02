@echo off
chcp 65001 >nul
echo Stopping My Schedule Local Edition...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8100 " ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>&1
echo Done.
timeout /t 2 >nul
