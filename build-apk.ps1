# Build APK without NDK issues
$env:ANDROID_NDK_ROOT = ""
$env:ANDROID_NDK_PATH = ""
$env:ANDROID_NDK_HOME = ""

Write-Host "Building APK for your Android device..."

# Navigate to android directory
Set-Location android

# Clean previous builds
.\gradlew.bat clean

# Build debug APK
.\gradlew.bat assembleDebug --info

if ($?) {
    Write-Host "APK built successfully!"
    Write-Host "APK location: app\build\outputs\apk\debug\app-debug.apk"
    
    # Check if ADB is available and device is connected
    try {
        $devices = adb devices 2>$null
        if ($devices -match "device$") {
            Write-Host "Android device detected! Installing APK..."
            adb install app\build\outputs\apk\debug\app-debug.apk
        } else {
            Write-Host "Please manually install the APK on your device:"
            Write-Host "1. Copy app\build\outputs\apk\debug\app-debug.apk to your phone"
            Write-Host "2. Enable 'Install from unknown sources' in Settings"
            Write-Host "3. Tap the APK file to install"
        }
    } catch {
        Write-Host "ADB not found. Manual installation required:"
        Write-Host "1. Copy app\build\outputs\apk\debug\app-debug.apk to your phone"
        Write-Host "2. Enable 'Install from unknown sources' in Settings"
        Write-Host "3. Tap the APK file to install"
    }
} else {
    Write-Host "Build failed. Trying alternative approach..."
}
