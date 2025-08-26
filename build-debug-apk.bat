@echo off
echo ========================================
echo     LOCAL APK BUILD WITH LATEST UI
echo ========================================
echo.

echo Step 1: Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Running prebuild to generate Android project...
call npx expo prebuild --platform android --clean
if %errorlevel% neq 0 (
    echo Failed to prebuild Android project
    pause
    exit /b 1
)

echo.
echo Step 3: Building APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo Failed to build APK
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ========================================
echo     BUILD COMPLETE!
echo ========================================
echo APK Location: android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
