@echo off
echo ========================================
echo     QUICK DEPENDENCY FIX
echo ========================================
echo.
echo Fixing missing dependencies for web build...
echo.

echo Installing react-native-svg-transformer...
call pnpm add react-native-svg-transformer@1.0.0

echo Installing react-native-web...
call pnpm add react-native-web

echo Installing react-native-svg...
call pnpm add react-native-svg

echo.
echo Dependencies installed! You can now run:
echo - build-web-apk.bat
echo - build-simple-web.bat
echo.
pause
