# PowerShell script to build APK with Flutter Driver enabled and run Appium tests
# Usage: .\build-and-test.ps1 [--skip-build] [--skip-appium]

param(
    [switch]$SkipBuild,
    [switch]$SkipAppium
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flutter Appium Test Build & Run Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory (mobile-app)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Step 1: Get Flutter dependencies
if (-not $SkipBuild) {
    Write-Host "Step 1: Getting Flutter dependencies..." -ForegroundColor Yellow
    flutter pub get
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to get Flutter dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# Step 2: Build APK with Flutter Driver enabled
if (-not $SkipBuild) {
    Write-Host "Step 2: Building APK with Flutter Driver enabled..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes..." -ForegroundColor Gray
    
    flutter build apk --debug --dart-define=ENABLE_FLUTTER_DRIVER=true
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to build APK" -ForegroundColor Red
        exit 1
    }
    
    $apkPath = "build\app\outputs\flutter-apk\app-debug.apk"
    if (Test-Path $apkPath) {
        $apkSize = (Get-Item $apkPath).Length / 1MB
        $apkSizeRounded = [math]::Round($apkSize, 2)
        Write-Host "[OK] APK built successfully: $apkPath ($apkSizeRounded MB)" -ForegroundColor Green
    } else {
        Write-Host "Warning: APK file not found at expected location" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Step 3: Check if Appium is running (optional - WebdriverIO will start it if needed)
Write-Host "Step 3: Checking Appium server..." -ForegroundColor Yellow
$appiumRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4723/status" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $appiumRunning = $true
        Write-Host "[OK] Appium server is already running" -ForegroundColor Green
    }
} catch {
    $appiumRunning = $false
    Write-Host "Appium server is not running (WebdriverIO will start it automatically)" -ForegroundColor Yellow
}

# Note: WebdriverIO's appium-service will automatically start Appium if needed
# We don't need to start it manually to avoid conflicts
Write-Host "Note: WebdriverIO will manage Appium server automatically" -ForegroundColor Gray
Write-Host "If Appium fails to start, try starting it manually first:" -ForegroundColor Gray
Write-Host "  cd appium_flutter_test" -ForegroundColor Gray
Write-Host "  appium --base-path / --relaxed-security --port 4723" -ForegroundColor Gray
Write-Host ""

# Step 4: Run Appium tests
Write-Host "Step 4: Running Appium tests..." -ForegroundColor Yellow
Write-Host ""

$appiumTestDir = Join-Path $scriptDir "appium_flutter_test"
Set-Location $appiumTestDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install npm dependencies" -ForegroundColor Red
        exit 1
    }
}

# Run the tests - only phase7_feedback_detail.spec.js
Write-Host "Running WebdriverIO test: phase7_feedback_detail.spec.js..." -ForegroundColor Cyan
npx wdio run ./wdio.conf.js --spec ./test/specs/phase7_feedback_detail.spec.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "[SUCCESS] All tests completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "[FAILED] Some tests failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
