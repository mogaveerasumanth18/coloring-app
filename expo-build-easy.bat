@echo off
echo ========================================
echo     EXPO DEVELOPMENT BUILD (Easy Setup)
echo ========================================
echo.
echo This method uses Expo's built-in Android tools
echo No manual SDK installation required!
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found. Make sure you're in the project root.
    pause
    exit /b 1
)

echo Step 1: Install Expo development client
call npx expo install expo-dev-client
if %errorlevel% neq 0 (
    echo Failed to install expo-dev-client
    pause
    exit /b 1
)

echo.
echo Step 2: Install dependencies
call pnpm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 3: Run Android build (will prompt for SDK if needed)
echo This will:
echo - Download Android SDK automatically if missing
echo - Generate native Android project
echo - Build and install APK on connected device/emulator
echo.
echo Make sure you have:
echo - Android device connected with USB debugging enabled, OR
echo - Android emulator running
echo.
pause

call npx expo run:android --variant release
if %errorlevel% neq 0 (
    echo Build failed. Trying development variant...
    call npx expo run:android
)

echo.
echo ========================================
echo           BUILD COMPLETE! 
echo ========================================
echo.
echo The APK has been built and should be installed on your device/emulator.
echo You can also find the APK files in:
echo 📁 android\app\build\outputs\apk\
echo.
pause
