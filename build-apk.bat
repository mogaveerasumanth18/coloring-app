@echo off
echo Building APK locally...
echo.

echo Step 1: Prebuild (generates native code)
call npx expo prebuild --platform android

echo.
echo Step 2: Building release APK
cd android
call gradlew assembleRelease

echo.
echo APK built! Check: android\app\build\outputs\apk\release\app-release.apk
echo.
pause
