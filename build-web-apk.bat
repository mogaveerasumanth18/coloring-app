@echo off
echo ========================================
echo      WEB-BASED APK BUILDER
echo ========================================
echo.
echo This method builds APK using web browsers - no Android SDK needed!
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found. Make sure you're in the project root.
    pause
    exit /b 1
)

echo Step 1: Install dependencies
call pnpm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 1.5: Install missing web build dependencies
call pnpm add react-native-svg-transformer --dev
call pnpm add react-native-web --dev

echo.
echo Step 2: Generate optimized web build
call npx expo export --platform web
if %errorlevel% neq 0 (
    echo Failed to create web build
    pause
    exit /b 1
)

echo.
echo Step 3: Starting local web server...
echo.
echo ========================================
echo         WEB BUILD COMPLETE!
echo ========================================
echo.
echo Your app is now available as a web app!
echo.
echo OPTION 1: Test in browser
start http://localhost:3000
call npx serve dist -p 3000

echo.
echo OPTION 2: Convert to APK using online tools
echo 1. Upload your web app to a hosting service (Netlify/Vercel)
echo 2. Use PWABuilder: https://www.pwabuilder.com/
echo 3. Or use ApkOnline: https://www.apkonline.net/
echo 4. Enter your web app URL to generate APK
echo.
echo OPTION 3: Use Capacitor for native build
echo 1. Run: npx @capacitor/cli add android
echo 2. Run: npx cap sync android
echo 3. Run: npx cap open android (opens in Android Studio)
echo.
echo OPTION 4: Initialize EAS Build
npx eas-cli init
pause
