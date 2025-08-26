@echo off
echo ========================================
echo      ANDROID SDK QUICK INSTALLER
echo ========================================
echo.
echo This script will help you install Android SDK command-line tools
echo.

set "SDK_DIR=%LOCALAPPDATA%\Android\Sdk"
set "CMDTOOLS_DIR=%SDK_DIR%\cmdline-tools\latest"

echo Checking if SDK directory exists...
if not exist "%SDK_DIR%" (
    echo Creating SDK directory: %SDK_DIR%
    mkdir "%SDK_DIR%"
)

if not exist "%CMDTOOLS_DIR%" (
    echo SDK Command-line tools not found. 
    echo.
    echo OPTION 1: Download Android Studio (Recommended - GUI)
    echo   1. Go to: https://developer.android.com/studio
    echo   2. Download and install Android Studio
    echo   3. Open Android Studio and let it install SDK components
    echo   4. SDK will be installed to: %SDK_DIR%
    echo.
    echo OPTION 2: Manual Command-line Tools Download
    echo   1. Go to: https://developer.android.com/studio#command-tools
    echo   2. Download "Command line tools only" for Windows
    echo   3. Extract to: %SDK_DIR%\cmdline-tools\latest\
    echo   4. Re-run this script
    echo.
    echo OPTION 3: Use Expo's automatic installer
    echo   1. Run: npx expo run:android
    echo   2. Follow prompts to install SDK automatically
    echo.
    pause
    exit /b 1
)

echo SDK found: %SDK_DIR%
echo Setting up environment variables...

REM Set ANDROID_HOME for current session
set "ANDROID_HOME=%SDK_DIR%"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

echo.
echo To make this permanent, add these to your system environment variables:
echo ANDROID_HOME=%SDK_DIR%
echo PATH=%SDK_DIR%\platform-tools;%SDK_DIR%\cmdline-tools\latest\bin
echo.

REM Create local.properties for the project
cd /d "%~dp0"
if exist "android" (
    echo sdk.dir=%SDK_DIR:\=/% > android\local.properties
    echo Created android\local.properties
) else (
    echo Warning: android folder not found. Run 'npx expo prebuild --platform android' first.
)

echo.
echo ========================================
echo          SDK SETUP COMPLETE!
echo ========================================
echo.
echo You can now run the build script.
echo.
pause
