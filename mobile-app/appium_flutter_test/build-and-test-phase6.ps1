# Build and Test Script for Phase 6 Appium Tests (KPI Dashboard & Training)
# This script builds the Flutter app with Flutter Driver enabled and runs Appium tests
# Usage: .\build-and-test-phase6.ps1 [test-file] [-SkipBuild]
# Examples:
#   .\build-and-test-phase6.ps1 phase6_kpi_dashboard.spec.js
#   .\build-and-test-phase6.ps1 phase6_kpi_dashboard.spec.js -SkipBuild

param(
    [Parameter(Mandatory=$false)]
    [string]$TestFile = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 6: Appium Test Build & Run (KPI Dashboard & Training)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileAppDir = Split-Path -Parent $scriptDir

# Change to mobile app directory
Set-Location $mobileAppDir

# Build steps (skip if -SkipBuild is used)
if (-not $SkipBuild) {
    Write-Host "Step 1: Running flutter pub get..." -ForegroundColor Yellow
    flutter pub get
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: flutter pub get failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Step 2: Building APK with ENABLE_FLUTTER_DRIVER flag..." -ForegroundColor Yellow
    Write-Host "   This enables Flutter Driver extension for Appium testing" -ForegroundColor Gray

    # Build APK with Flutter Driver enabled
    flutter build apk --debug --dart-define=ENABLE_FLUTTER_DRIVER=true
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: APK build failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "SUCCESS: APK built successfully!" -ForegroundColor Green
    Write-Host "   Location: build/app/outputs/flutter-apk/app-debug.apk" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "Skipping build steps (using existing APK)..." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Running Appium tests..." -ForegroundColor Yellow

# Check if Appium is already running on port 4723
$portCheck = Get-NetTCPConnection -LocalPort 4723 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "   INFO: Appium server is already running on port 4723" -ForegroundColor Green
    Write-Host "   Using existing Appium instance..." -ForegroundColor Gray
    Write-Host "   (If you need to restart Appium, stop it manually first: .\stop-appium.ps1)" -ForegroundColor Gray
} else {
    Write-Host "   INFO: Appium is not running." -ForegroundColor Yellow
    Write-Host "   WebdriverIO will try to start Appium automatically (may take 1-2 minutes)..." -ForegroundColor Gray
}

Write-Host ""

# Change to appium test directory
Set-Location "$mobileAppDir\appium_flutter_test"

# Determine which test to run
if ($TestFile -eq "") {
    Write-Host "WARNING: No test file specified. Available test files:" -ForegroundColor Yellow
    Write-Host "   - phase6_kpi_dashboard.spec.js" -ForegroundColor Gray
    Write-Host "   - phase6_complete_performance_flow.spec.js" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Usage: .\build-and-test-phase6.ps1 [test-file] [-SkipBuild]" -ForegroundColor Yellow
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "   .\build-and-test-phase6.ps1 phase6_kpi_dashboard.spec.js" -ForegroundColor Gray
    Write-Host "   .\build-and-test-phase6.ps1 phase6_kpi_dashboard.spec.js -SkipBuild" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Validate test file exists
$testFilePath = "test\specs\$TestFile"
if (-not (Test-Path $testFilePath)) {
    Write-Host "ERROR: Test file not found: $testFilePath" -ForegroundColor Red
    Write-Host "   Available test files:" -ForegroundColor Yellow
    Get-ChildItem "test\specs\*.spec.js" | ForEach-Object {
        Write-Host "   - $($_.Name)" -ForegroundColor Gray
    }
    exit 1
}

$testMsg = "Running test: $TestFile"
Write-Host $testMsg -ForegroundColor Cyan
Write-Host ""

# Run specific test file
npx wdio run wdio.conf.js --spec "test/specs/$TestFile"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Test failed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "Test passed!" -ForegroundColor Green
}

Write-Host ""
$separator = "========================================"
Write-Host $separator -ForegroundColor Cyan
Write-Host "Build and Test Complete!" -ForegroundColor Cyan
Write-Host $separator -ForegroundColor Cyan
Write-Host ""

