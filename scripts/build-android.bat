@echo off
REM Build Android release APK (one-click)
REM Usage: scripts\build-android.bat

setlocal

set JAVA_HOME=D:\Program Files (x86)\Java\jdk-21.0.2
set ANDROID_HOME=D:\Android\Sdk
set NODE_PATH=C:\Users\Jack\.qoder-cn\bin\node
set PATH=%NODE_PATH%;%PATH%

cd /d "%~dp0\.."

echo [1/4] Building web assets...
call npm run build
if errorlevel 1 goto :fail

echo [2/4] Syncing to Android...
call npx cap sync android
if errorlevel 1 goto :fail

echo [3/4] Building release APK...
cd android
call gradlew.bat assembleRelease
if errorlevel 1 goto :fail

echo [4/4] Done!
echo APK: android\app\build\outputs\apk\release\app-release.apk
for %%F in (app\build\outputs\apk\release\app-release.apk) do echo Size: %%~zF bytes
goto :end

:fail
echo BUILD FAILED
exit /b 1

:end
endlocal
