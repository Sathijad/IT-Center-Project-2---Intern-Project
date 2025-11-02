# PowerShell script to run Flutter app on Android Emulator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flutter Android Emulator Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Flutter is installed
Write-Host "1. Checking Flutter installation..." -ForegroundColor Yellow
$flutterVersion = flutter --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Flutter is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Flutter: https://flutter.dev/docs/get-started/install" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Flutter is installed" -ForegroundColor Green
Write-Host ""

# Check available devices
Write-Host "2. Checking available devices..." -ForegroundColor Yellow
$devices = flutter devices 2>&1
Write-Host $devices
Write-Host ""

# Check if Android emulator is running
$androidDevices = flutter devices | Select-String "android"
if (-not $androidDevices) {
    Write-Host "WARNING: No Android emulator detected!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available options:" -ForegroundColor Cyan
    Write-Host "  a) Create and start an emulator from Android Studio" -ForegroundColor White
    Write-Host "  b) List available emulators and launch one:" -ForegroundColor White
    Write-Host ""
    Write-Host "     flutter emulators" -ForegroundColor Gray
    Write-Host "     flutter emulators --launch <emulator_id>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Would you like to list available emulators? (y/n)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host ""
        Write-Host "Available emulators:" -ForegroundColor Cyan
        flutter emulators
        Write-Host ""
        Write-Host "To launch an emulator, run:" -ForegroundColor Yellow
        Write-Host "  flutter emulators --launch <emulator_id>" -ForegroundColor Gray
        Write-Host ""
        Write-Host "After launching, run this script again." -ForegroundColor Yellow
        exit 0
    }
    exit 1
}

Write-Host "✓ Android emulator detected" -ForegroundColor Green
Write-Host ""

# Navigate to mobile-app directory
$currentDir = Get-Location
if (-not $currentDir.Path.EndsWith("mobile-app")) {
    if (Test-Path "mobile-app") {
        Set-Location "mobile-app"
        Write-Host "3. Changed to mobile-app directory" -ForegroundColor Yellow
    }
}

# Get dependencies
Write-Host "4. Getting Flutter dependencies..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to get dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Run the app
Write-Host "5. Running Flutter app on Android emulator..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Hot reload commands:" -ForegroundColor Cyan
Write-Host "  Press 'r' to hot reload" -ForegroundColor Gray
Write-Host "  Press 'R' to hot restart" -ForegroundColor Gray
Write-Host "  Press 'q' to quit" -ForegroundColor Gray
Write-Host ""
Write-Host "Starting app..." -ForegroundColor Yellow
Write-Host ""

flutter run -d android

