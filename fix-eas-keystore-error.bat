@echo off
echo ========================================
echo    EAS KEYSTORE ERROR - ALTERNATIVES
echo ========================================
echo.
echo EAS cloud keystore generation is currently failing (500 error).
echo Here are working alternatives:
echo.

echo OPTION 1: Local Android Build (Best Quality)
echo   Status: SDK installation in progress...
echo   Command: build-offline-apk.bat
echo   Time: 10-15 minutes (includes SDK download)
echo.

echo OPTION 2: Web-to-APK Conversion (Fastest)
echo   Status: Web build already successful
echo   Time: 2-3 minutes
echo   Steps:
echo   1. Go to https://www.pwabuilder.com/
echo   2. Enter: http://localhost:3000
echo   3. Generate APK
echo.

echo OPTION 3: Capacitor Native Build
echo   Install Capacitor and build natively
echo   Command: Will be created if needed
echo.

echo.
set /p choice="Choose option (1/2/3): "

if "%choice%"=="1" (
    echo Waiting for SDK installation to complete...
    echo Then running local build...
    timeout /t 5
    call build-offline-apk.bat
) else if "%choice%"=="2" (
    echo Opening PWA Builder for web-to-APK conversion...
    start https://www.pwabuilder.com/
    echo.
    echo Instructions:
    echo 1. Website will open in your browser
    echo 2. Enter URL: http://localhost:3000
    echo 3. Click "Start" to analyze your app
    echo 4. Click "Build My PWA"
    echo 5. Download the Android APK
    echo.
    echo Starting your local web server...
    start http://localhost:3000
    npx serve dist -p 3000
) else if "%choice%"=="3" (
    echo Installing Capacitor...
    call pnpm add @capacitor/core @capacitor/cli @capacitor/android
    call npx cap init
    call npx cap add android
    call npx cap sync android
    echo.
    echo Capacitor setup complete!
    echo To build: npx cap open android
    echo Then use Android Studio to build APK
) else (
    echo Invalid choice. Defaulting to web-to-APK conversion...
    start https://www.pwabuilder.com/
    start http://localhost:3000
    npx serve dist -p 3000
)

echo.
pause
