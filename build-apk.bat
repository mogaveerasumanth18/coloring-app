@echo off
echo Building APK locally...
echo.

echo Step 1: Generate keystore (if needed)
if not exist "android\app\debug.keystore" (
    echo Keystore not found. Generating...
    call generate-keystore.bat
) else (
    echo Keystore exists, skipping generation.
)

echo.
echo Step 2: Prebuild (generates native code)
call npx expo prebuild --platform android

echo.
echo Step 3: Building release APK
cd android
call gradlew assembleRelease

echo.
echo APK built! Check: android\app\build\outputs\apk\release\app-release.apk
echo.
pause
