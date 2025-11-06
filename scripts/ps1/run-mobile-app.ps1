# Run Mobile App on Android Device
# This script will launch the Flutter app on your Android emulator or device

Write-Host "`n=== IT Center Mobile App - Launcher ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "mobile-app")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Check if backend is running
Write-Host "Step 1: Checking if backend is running..." -ForegroundColor Yellow
$response = try {
    Invoke-WebRequest -Uri "http://localhost:8080/healthz" -TimeoutSec 2 -ErrorAction Stop
    $true
} catch {
    $false
}

if (-not $response) {
    Write-Host "⚠️  Backend is not running on localhost:8080" -ForegroundColor Yellow
    Write-Host "Would you like to start the backend first? (Y/n)" -ForegroundColor Yellow
    $startBackend = Read-Host
    if ($startBackend -eq 'Y' -or $startBackend -eq 'y' -or $startBackend -eq '') {
        Write-Host "Starting backend..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd auth-backend; ./start.bat" -WindowStyle Normal
        Write-Host "Waiting for backend to start (10 seconds)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
} else {
    Write-Host "✅ Backend is running" -ForegroundColor Green
}

# Step 2: Check available devices
Write-Host "`nStep 2: Checking available devices..." -ForegroundColor Yellow
cd mobile-app
$devices = flutter devices 2>&1
Write-Host $devices

# Check if Android device is available
$hasAndroid = $devices -match "android" -or $devices -match "emulator"

if (-not $hasAndroid -or $devices -match "is offline") {
    Write-Host "`n⚠️  No Android device is ready yet" -ForegroundColor Yellow
    Write-Host "Starting Android emulator..." -ForegroundColor Yellow
    
    # Launch emulator
    flutter emulators --launch Medium_Phone_API_36.1
    
    Write-Host "`nWaiting for emulator to boot (this may take 2-3 minutes)..." -ForegroundColor Cyan
    Write-Host "You can see the emulator window opening. Please wait until it fully loads." -ForegroundColor Cyan
    Write-Host ""
    
    # Keep checking until device is ready
    $attempts = 0
    $maxAttempts = 30
    
    while ($attempts -lt $maxAttempts) {
        Start-Sleep -Seconds 10
        $devices = flutter devices 2>&1
        
        if ($devices -match "android" -and $devices -notmatch "offline") {
            Write-Host "✅ Android device is ready!" -ForegroundColor Green
            break
        }
        
        $attempts++
        Write-Host "Checking... (Attempt $attempts/$maxAttempts)" -ForegroundColor Yellow
    }
    
    if ($attempts -eq $maxAttempts) {
        Write-Host "`n❌ Emulator is taking too long to boot" -ForegroundColor Red
        Write-Host "Please manually open the emulator from Android Studio and try again" -ForegroundColor Yellow
        Write-Host "Or try: flutter run -d android" -ForegroundColor Yellow
        exit 1
    }
}

# Step 3: Run the app
Write-Host "`nStep 3: Running the app on Android..." -ForegroundColor Yellow
Write-Host "This will take 2-5 minutes for the first build" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tips while the app is running:" -ForegroundColor Cyan
Write-Host "   - Press 'r' to hot reload changes" -ForegroundColor White
Write-Host "   - Press 'R' to hot restart" -ForegroundColor White
Write-Host "   - Press 'q' to quit" -ForegroundColor White
Write-Host ""

# Run the Flutter app
flutter run -d android

