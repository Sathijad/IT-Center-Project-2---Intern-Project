# PowerShell script to install Android system images
# Run this if you get "No suitable Android AVD system images are available"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android System Images Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find Android SDK location
$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:ANDROID_HOME",
    "C:\Android\Sdk",
    "C:\Program Files\Android\Sdk"
)

$androidSdkPath = $null
foreach ($path in $sdkPaths) {
    if ($path -and (Test-Path $path)) {
        $androidSdkPath = $path
        break
    }
}

if (-not $androidSdkPath) {
    Write-Host "❌ Android SDK not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Android Studio first:" -ForegroundColor Yellow
    Write-Host "  1. Download: https://developer.android.com/studio" -ForegroundColor White
    Write-Host "  2. Install Android Studio" -ForegroundColor White
    Write-Host "  3. Open Android Studio" -ForegroundColor White
    Write-Host "  4. Go to: Tools → SDK Manager" -ForegroundColor White
    Write-Host "  5. Check: Android 13 (API 33) in SDK Platforms tab" -ForegroundColor White
    Write-Host "  6. Check: Android Emulator in SDK Tools tab" -ForegroundColor White
    Write-Host "  7. Click Apply and wait for download" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again, or create emulator from Android Studio." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Found Android SDK at: $androidSdkPath" -ForegroundColor Green
Write-Host ""

# Find sdkmanager
$sdkmanagerPaths = @(
    "$androidSdkPath\cmdline-tools\latest\bin\sdkmanager.bat",
    "$androidSdkPath\tools\bin\sdkmanager.bat",
    "$androidSdkPath\cmdline-tools\bin\sdkmanager.bat"
)

$sdkmanager = $null
foreach ($path in $sdkmanagerPaths) {
    if (Test-Path $path) {
        $sdkmanager = $path
        break
    }
}

if (-not $sdkmanager) {
    Write-Host "❌ SDK Manager not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please use Android Studio SDK Manager instead:" -ForegroundColor Yellow
    Write-Host "  1. Open Android Studio" -ForegroundColor White
    Write-Host "  2. Go to: Tools → SDK Manager" -ForegroundColor White
    Write-Host "  3. SDK Platforms tab → Check Android 13 (API 33)" -ForegroundColor White
    Write-Host "  4. SDK Tools tab → Check Android Emulator" -ForegroundColor White
    Write-Host "  5. Click Apply" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✓ Found SDK Manager at: $sdkmanager" -ForegroundColor Green
Write-Host ""

# Check if system images are already installed
Write-Host "Checking for existing system images..." -ForegroundColor Yellow
$avdmanager = "$androidSdkPath\cmdline-tools\latest\bin\avdmanager.bat"
if (-not (Test-Path $avdmanager)) {
    $avdmanager = "$androidSdkPath\tools\bin\avdmanager.bat"
}

if (Test-Path $avdmanager) {
    $targets = & $avdmanager list targets 2>&1
    if ($targets -match "API level") {
        Write-Host "✓ Found existing system images" -ForegroundColor Green
        Write-Host ""
        Write-Host "Available targets:" -ForegroundColor Cyan
        Write-Host $targets
        Write-Host ""
        Write-Host "You can now create an emulator with:" -ForegroundColor Yellow
        Write-Host "  flutter emulators --create --name IT_EMPLOYEE" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Or use Android Studio: Device Manager → Create Device" -ForegroundColor Gray
        exit 0
    }
}

# Install system image
Write-Host "Installing Android 13 (API 33) system image..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes depending on your internet speed." -ForegroundColor Yellow
Write-Host ""

$systemImage = "system-images;android-33;google_apis;x86_64"
Write-Host "Installing: $systemImage" -ForegroundColor Cyan

& $sdkmanager $systemImage

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try using Android Studio SDK Manager instead:" -ForegroundColor Yellow
    Write-Host "  1. Open Android Studio" -ForegroundColor White
    Write-Host "  2. Tools → SDK Manager" -ForegroundColor White
    Write-Host "  3. SDK Platforms → Check Android 13 (API 33)" -ForegroundColor White
    Write-Host "  4. Click Apply" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "✓ System image installed successfully!" -ForegroundColor Green
Write-Host ""

# Accept licenses
Write-Host "Accepting Android licenses..." -ForegroundColor Yellow
& $sdkmanager --licenses
Write-Host ""

# Verify installation
Write-Host "Verifying installation..." -ForegroundColor Yellow
if (Test-Path $avdmanager) {
    $targets = & $avdmanager list targets 2>&1
    Write-Host $targets
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Create emulator via Android Studio:" -ForegroundColor White
Write-Host "     - Open Android Studio" -ForegroundColor Gray
Write-Host "     - Device Manager → Create Device" -ForegroundColor Gray
Write-Host "     - Select Pixel 5 → Select Android 13 → Finish" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. OR create via command line:" -ForegroundColor White
Write-Host "     flutter emulators --create --name IT_EMPLOYEE" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Launch emulator:" -ForegroundColor White
Write-Host "     flutter emulators --launch IT_EMPLOYEE" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Run your app:" -ForegroundColor White
Write-Host "     flutter run" -ForegroundColor Gray
Write-Host ""


