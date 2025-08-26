@echo off
echo ========================================
echo    OFFLINE APK BUILD (No EAS Required)
echo ========================================
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
echo Step 2: Check Android SDK
set "SDK_FOUND=false"

REM Check common Android SDK locations
if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    set "SDK_FOUND=true"
)
if exist "%USERPROFILE%\AppData\Local\Android\Sdk" (
    set "ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk"
    set "SDK_FOUND=true"
)
if exist "%PROGRAMFILES%\Android\Android Studio\sdk" (
    set "ANDROID_HOME=%PROGRAMFILES%\Android\Android Studio\sdk"
    set "SDK_FOUND=true"
)
if exist "%PROGRAMFILES(X86)%\Android\android-sdk" (
    set "ANDROID_HOME=%PROGRAMFILES(X86)%\Android\android-sdk"
    set "SDK_FOUND=true"
)

if "%SDK_FOUND%"=="false" (
    echo.
    echo ❌ Android SDK not found!
    echo.
    echo OPTION 1: Auto-install SDK (Recommended)
    echo   Run: auto-install-sdk.bat (I created this for you)
    echo.
    echo OPTION 2: Install Android Studio
    echo   1. Download: https://developer.android.com/studio
    echo   2. Install Android Studio
    echo   3. Open Android Studio and install SDK components
    echo.
    echo OPTION 3: Web-based APK (No SDK needed)
    echo   Run: build-web-apk.bat
    echo.
    echo Would you like me to run auto-install-sdk.bat now? (y/n)
    set /p choice=
    if /i "%choice%"=="y" (
        call auto-install-sdk.bat
        if %errorlevel% equ 0 (
            echo SDK installed! Continuing with build...
            goto :continue_build
        )
    )
    pause
    exit /b 1
)

:continue_build
echo Android SDK found: %ANDROID_HOME%

REM Create local.properties file
echo sdk.dir=%ANDROID_HOME:\=/% > android\local.properties
echo Created android\local.properties with SDK path

echo.
echo Step 3: Generate native Android project
call npx expo prebuild --platform android --clean
if %errorlevel% neq 0 (
    echo Failed to generate native project
    pause
    exit /b 1
)

echo.
echo Step 4: Build APK using Gradle
cd android

echo Building debug APK (faster, for testing)...
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo Debug build failed
    cd ..
    pause
    exit /b 1
)

echo.
echo Building release APK (optimized)...
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo Release build failed, but debug APK was successful
    cd ..
    echo.
    echo ========================================
    echo        DEBUG BUILD COMPLETE! 
    echo ========================================
    echo.
    echo APK file generated:
    echo 📱 Debug APK: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    pause
    exit /b 0
)

cd ..

echo.
echo ========================================
echo           BUILD COMPLETE! 
echo ========================================
echo.
echo APK files generated:
echo 📱 Debug APK:   android\app\build\outputs\apk\debug\app-debug.apk
echo 📱 Release APK: android\app\build\outputs\apk\release\app-release.apk
echo.
echo To install on device:
echo 1. Enable "Unknown Sources" in Android settings
echo 2. Copy APK to device and tap to install
echo 3. Or use: adb install path\to\apk
echo.
pause
