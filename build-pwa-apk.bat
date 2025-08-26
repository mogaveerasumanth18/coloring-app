@echo off
echo ========================================
echo      PWA-OPTIMIZED WEB BUILD
echo ========================================
echo.
echo Building a Progressive Web App (PWA) ready for APK conversion
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
echo Step 2: Generate PWA-optimized web build
call npx expo export --platform web
if %errorlevel% neq 0 (
    echo Failed to create web build
    pause
    exit /b 1
)

echo.
echo Step 3: Create web manifest for PWA
echo Creating manifest.json for PWA compatibility...

REM Create a basic PWA manifest
echo { > dist\manifest.json
echo   "name": "ColorFun Kids - Digital Coloring Book", >> dist\manifest.json
echo   "short_name": "ColorFun", >> dist\manifest.json
echo   "description": "Digital Coloring Book for Kids", >> dist\manifest.json
echo   "start_url": "/", >> dist\manifest.json
echo   "display": "standalone", >> dist\manifest.json
echo   "background_color": "#2E3C4B", >> dist\manifest.json
echo   "theme_color": "#2E3C4B", >> dist\manifest.json
echo   "orientation": "portrait", >> dist\manifest.json
echo   "icons": [ >> dist\manifest.json
echo     { >> dist\manifest.json
echo       "src": "icon.png", >> dist\manifest.json
echo       "sizes": "192x192", >> dist\manifest.json
echo       "type": "image/png" >> dist\manifest.json
echo     } >> dist\manifest.json
echo   ] >> dist\manifest.json
echo } >> dist\manifest.json

echo.
echo Step 4: Copy icon for PWA
if exist "assets\icon.png" copy "assets\icon.png" "dist\"

echo.
echo Step 5: Starting PWA-ready web server...
echo.
echo ========================================
echo         PWA BUILD COMPLETE!
echo ========================================
echo.
echo Your PWA is now ready!
echo.

REM Start the server
start http://localhost:3000
call npx serve dist -p 3000 -s

echo.
echo ========================================
echo       PWA TO APK CONVERSION
echo ========================================
echo.
echo Your app is now PWA-ready! Convert to APK:
echo.
echo METHOD 1: PWABuilder (Best Quality)
echo   1. Go to: https://www.pwabuilder.com/
echo   2. Enter: http://localhost:3000
echo   3. Click "Build My PWA"
echo   4. Download Android APK
echo.
echo METHOD 2: Bubble.is (Easy)
echo   1. Go to: https://bubble.is/
echo   2. Enter your app URL
echo   3. Generate APK
echo.
echo METHOD 3: AppsGeyser (Simple)
echo   1. Go to: https://appsgeyser.com/
echo   2. Choose "Website" template
echo   3. Enter URL and create APK
echo.
pause
