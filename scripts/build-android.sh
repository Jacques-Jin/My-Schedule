#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="D:/Program Files (x86)/Java/jdk-21.0.2"
export ANDROID_HOME="D:/Android/Sdk"
export PATH="/c/Users/Jack/.qoder-cn/bin/node:$PATH"

cd "$(dirname "$0")/.."

echo "[1/4] Building web assets..."
npm run build

echo "[2/4] Syncing to Android..."
npx cap sync android

echo "[3/4] Building release APK..."
cd android
JAVA_HOME="$JAVA_HOME" ANDROID_HOME="$ANDROID_HOME" ./gradlew assembleRelease

echo "[4/4] Done!"
ls -lh app/build/outputs/apk/release/app-release.apk
