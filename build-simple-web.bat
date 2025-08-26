@echo off
echo ========================================
echo     SIMPLE WEB APP BUILDER
echo ========================================
echo.
echo Building a simple web version without complex dependencies
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found. Make sure you're in the project root.
    pause
    exit /b 1
)

echo Step 1: Install core dependencies only
call pnpm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Create temporary metro config for web
rename metro.config.js metro.config.backup.js
echo const { getDefaultConfig } = require('expo/metro-config'); > metro.config.temp.js
echo. >> metro.config.temp.js
echo const config = getDefaultConfig(__dirname); >> metro.config.temp.js
echo module.exports = config; >> metro.config.temp.js

echo.
echo Step 3: Generate web build
call npx expo export --platform web
set BUILD_RESULT=%errorlevel%

echo.
echo Step 4: Restore original metro config
del metro.config.temp.js
rename metro.config.backup.js metro.config.js

if %BUILD_RESULT% neq 0 (
    echo Failed to create web build
    pause
    exit /b 1
)

echo.
echo Step 5: Starting local web server...
echo.
echo ========================================
echo         WEB BUILD COMPLETE!
echo ========================================
echo.
echo Your app is now available as a web app!
echo Opening browser...
echo.

REM Check if serve is installed, if not install it
call npx serve --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing serve...
    call npm install -g serve
)

echo Starting server on http://localhost:3000
start http://localhost:3000
call npx serve dist -p 3000

echo.
echo ========================================
echo      WEB TO APK CONVERSION OPTIONS
echo ========================================
echo.
echo Now that your web app is running, you can convert it to APK:
echo.
echo OPTION 1: PWABuilder (Recommended)
echo   1. Go to: https://www.pwabuilder.com/
echo   2. Enter: http://localhost:3000
echo   3. Click "Build My PWA" 
echo   4. Download Android APK
echo.
echo OPTION 2: APK Online
echo   1. Go to: https://www.apkonline.net/
echo   2. Upload your web files or enter URL
echo   3. Generate APK
echo.
echo OPTION 3: Cordova/PhoneGap Build
echo   1. Go to: https://build.phonegap.com/
echo   2. Upload your web project
echo   3. Build APK online
echo.
pause
