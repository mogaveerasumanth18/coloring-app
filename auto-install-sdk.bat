@echo off
echo ========================================
echo   AUTOMATIC ANDROID SDK INSTALLER
echo ========================================
echo.
echo This will download and install Android SDK automatically
echo.

set "SDK_DIR=%LOCALAPPDATA%\Android\Sdk"
set "CMDTOOLS_ZIP=%TEMP%\commandlinetools-win-11076708_latest.zip"
set "CMDTOOLS_URL=https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"

echo Step 1: Creating SDK directory...
if not exist "%SDK_DIR%" mkdir "%SDK_DIR%"
if not exist "%SDK_DIR%\cmdline-tools" mkdir "%SDK_DIR%\cmdline-tools"

echo Step 2: Checking if SDK tools already exist...
if exist "%SDK_DIR%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo SDK tools already installed!
    goto :setup_env
)

echo Step 3: Downloading Android command-line tools...
echo This may take a few minutes...
powershell -Command "try { Invoke-WebRequest -Uri '%CMDTOOLS_URL%' -OutFile '%CMDTOOLS_ZIP%' -UseBasicParsing } catch { Write-Host 'Download failed. Please check your internet connection.'; exit 1 }"
if %errorlevel% neq 0 (
    echo Failed to download SDK tools.
    echo Please download manually from: https://developer.android.com/studio#command-tools
    pause
    exit /b 1
)

echo Step 4: Extracting SDK tools...
powershell -Command "Expand-Archive -Path '%CMDTOOLS_ZIP%' -DestinationPath '%SDK_DIR%\cmdline-tools\temp' -Force"
if %errorlevel% neq 0 (
    echo Failed to extract SDK tools.
    pause
    exit /b 1
)

echo Step 5: Moving tools to correct location...
move "%SDK_DIR%\cmdline-tools\temp\cmdline-tools" "%SDK_DIR%\cmdline-tools\latest"
rmdir /s /q "%SDK_DIR%\cmdline-tools\temp"
del "%CMDTOOLS_ZIP%"

:setup_env
echo Step 6: Setting up environment...
set "ANDROID_HOME=%SDK_DIR%"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

echo Step 7: Installing essential SDK components...
echo This will take several minutes...
call "%SDK_DIR%\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
call "%SDK_DIR%\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools" "platforms;android-34" "build-tools;34.0.0"

if %errorlevel% neq 0 (
    echo Warning: Some SDK components may not have installed properly.
    echo You can continue with the build anyway.
)

echo Step 8: Creating local.properties file...
cd /d "%~dp0"
if exist "android" (
    echo sdk.dir=%SDK_DIR:\=/% > android\local.properties
    echo Created android\local.properties
) else (
    echo Note: Will create local.properties after prebuild
)

echo.
echo ========================================
echo     ANDROID SDK INSTALLED SUCCESSFULLY!
echo ========================================
echo.
echo SDK Location: %SDK_DIR%
echo.
echo Environment variables set for this session:
echo ANDROID_HOME=%SDK_DIR%
echo.
echo To make permanent, add to your system environment:
echo 1. Open System Properties ^> Environment Variables
echo 2. Add ANDROID_HOME = %SDK_DIR%
echo 3. Add to PATH: %SDK_DIR%\platform-tools
echo.
echo You can now run build-offline-apk.bat successfully!
echo.
pause
