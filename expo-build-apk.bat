@echo off
echo ========================================
echo        EXPO APK BUILDER
echo ========================================
echo.
echo This script will try multiple methods to build your APK
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found. Make sure you're in the project root.
    pause
    exit /b 1
)

echo Step 1: Check EAS Build quota
echo Checking your EAS Build status...
call eas build:list --limit=1
if %errorlevel% neq 0 (
    echo EAS CLI might not be installed or configured.
    echo Installing EAS CLI...
    call npm install -g @expo/eas-cli
    call eas login
)

echo.
echo ========================================
echo         BUILD METHOD OPTIONS
echo ========================================
echo.
echo 1. EAS Build (Cloud) - Requires quota
echo 2. Local Android Build - Requires Android SDK
echo 3. Web Build + APK Conversion - No SDK required
echo.
set /p choice="Choose build method (1/2/3): "

if "%choice%"=="1" goto :eas_build
if "%choice%"=="2" goto :local_build  
if "%choice%"=="3" goto :web_build
echo Invalid choice. Defaulting to EAS Build.

:eas_build
echo.
echo ========================================
echo          EAS CLOUD BUILD
echo ========================================
echo.
echo Trying EAS Build with different profiles...

echo Attempting with 'simple' profile...
call eas build --platform android --profile simple --non-interactive
if %errorlevel% equ 0 goto :build_success

echo.
echo Attempting with 'local' profile (uses local credentials)...
call eas build --platform android --profile local --non-interactive
if %errorlevel% equ 0 goto :build_success

echo.
echo EAS Build failed. This might be due to:
echo - Free quota exceeded (resets in a few days)
echo - Missing credentials
echo - Configuration issues
echo.
echo Would you like to try local build instead? (y/n)
set /p retry="Enter choice: "
if /i "%retry%"=="y" goto :local_build
goto :build_failed

:local_build
echo.
echo ========================================
echo         LOCAL ANDROID BUILD
echo ========================================
echo.
echo Checking Android SDK...

REM Check for Android SDK
set "SDK_FOUND=false"
if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    set "SDK_FOUND=true"
)
if exist "%USERPROFILE%\AppData\Local\Android\Sdk" (
    set "ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk"
    set "SDK_FOUND=true"
)

if "%SDK_FOUND%"=="false" (
    echo Android SDK not found!
    echo.
    echo Would you like to auto-install Android SDK? (y/n)
    set /p install_sdk="Enter choice: "
    if /i "%install_sdk%"=="y" (
        call auto-install-sdk.bat
        if %errorlevel% equ 0 (
            set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
            set "SDK_FOUND=true"
        )
    ) else (
        echo Switching to web build method...
        goto :web_build
    )
)

if "%SDK_FOUND%"=="true" (
    echo SDK found: %ANDROID_HOME%
    
    echo Generating native Android project...
    call npx expo prebuild --platform android --clean
    
    echo Building APK...
    cd android
    call gradlew assembleRelease
    if %errorlevel% equ 0 (
        cd ..
        goto :build_success_local
    ) else (
        cd ..
        echo Local build failed. Trying web build...
        goto :web_build
    )
) else (
    echo SDK installation failed. Trying web build...
    goto :web_build
)

:web_build
echo.
echo ========================================
echo    WEB BUILD + APK CONVERSION
echo ========================================
echo.
echo Building web version for APK conversion...

call pnpm install
call npx expo export --platform web
if %errorlevel% neq 0 (
    echo Web build failed!
    goto :build_failed
)

echo.
echo Web build successful!
echo Starting local server for APK conversion...
start http://localhost:3000
call npx serve dist -p 3000 -s &

echo.
echo ========================================
echo       CONVERT WEB TO APK
echo ========================================
echo.
echo Your web app is running at: http://localhost:3000
echo.
echo Use these services to convert to APK:
echo 1. PWABuilder: https://www.pwabuilder.com/
echo 2. AppsGeyser: https://appsgeyser.com/
echo 3. Bubble.is: https://bubble.is/
echo.
echo Instructions:
echo 1. Go to one of the above websites
echo 2. Enter: http://localhost:3000
echo 3. Generate and download your APK
goto :end

:build_success
echo.
echo ========================================
echo      EAS BUILD SUCCESSFUL!
echo ========================================
echo.
echo Your APK has been built in the cloud!
echo Check your EAS dashboard or email for download link.
echo.
call eas build:list --limit=5
goto :end

:build_success_local
echo.
echo ========================================
echo     LOCAL BUILD SUCCESSFUL!
echo ========================================
echo.
echo APK files generated:
echo 📱 Release APK: android\app\build\outputs\apk\release\app-release.apk
echo.
echo To install on device:
echo 1. Enable "Unknown Sources" in Android settings
echo 2. Copy APK to device and tap to install
goto :end

:build_failed
echo.
echo ========================================
echo        ALL BUILD METHODS FAILED
echo ========================================
echo.
echo Possible solutions:
echo 1. Wait for EAS quota reset (check EAS dashboard)
echo 2. Install Android Studio for local builds
echo 3. Use web build + online APK converters
echo 4. Consider upgrading EAS subscription
goto :end

:end
echo.
pause
