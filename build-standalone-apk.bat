@echo off
echo ========================================
echo     STANDALONE APK BUILD
echo ========================================
echo This will create a standalone APK that doesn't require Expo Go
echo.

echo Step 1: Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Running prebuild to generate standalone Android project...
call npx expo prebuild --platform android --clean
if %errorlevel% neq 0 (
    echo Failed to prebuild Android project
    pause
    exit /b 1
)

echo.
echo Step 3: Building standalone release APK...
cd android
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo Failed to build standalone APK
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ========================================
echo     STANDALONE APK BUILD COMPLETE!
echo ========================================
echo APK Location: android\app\build\outputs\apk\release\app-release.apk
echo.
echo This APK can be installed directly without needing Expo Go!
echo.
pause
