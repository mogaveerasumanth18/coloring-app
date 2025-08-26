@echo off
echo Generating local keystore for APK signing...
echo.

REM Try to find Java installation
set "JAVA_HOME="
if exist "%ProgramFiles%\Java\jdk*" (
    for /d %%i in ("%ProgramFiles%\Java\jdk*") do set "JAVA_HOME=%%i"
)
if exist "%ProgramFiles%\Eclipse Adoptium\jdk*" (
    for /d %%i in ("%ProgramFiles%\Eclipse Adoptium\jdk*") do set "JAVA_HOME=%%i"
)
if exist "%ProgramFiles(x86)%\Java\jdk*" (
    for /d %%i in ("%ProgramFiles(x86)%\Java\jdk*") do set "JAVA_HOME=%%i"
)

if not defined JAVA_HOME (
    echo Java not found. Please install Java JDK or set JAVA_HOME manually.
    echo Download from: https://adoptium.net/
    pause
    exit /b 1
)

echo Using Java: %JAVA_HOME%
set "PATH=%JAVA_HOME%\bin;%PATH%"

REM Create android/app directory if it doesn't exist
if not exist "android\app" mkdir "android\app"

echo Generating debug keystore...
keytool -genkey -v -keystore android\app\debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Keystore generated successfully!
    echo Location: android\app\debug.keystore
    echo.
) else (
    echo.
    echo ❌ Failed to generate keystore
    echo.
)

pause
