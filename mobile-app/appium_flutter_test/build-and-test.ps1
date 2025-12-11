# Build and Test Script for Phase 6 Appium Tests
# This script builds the Flutter app with Flutter Driver enabled and runs Appium tests
# Usage: .\build-and-test.ps1 [test-file] [-SkipBuild]
# Examples:
#   .\build-and-test.ps1 phase6_schedule_overview.spec.js
#   .\build-and-test.ps1 phase6_schedule_overview.spec.js -SkipBuild

param(
    [Parameter(Mandatory=$false)]
    [string]$TestFile = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 6: Appium Test Build & Run" -ForegroundColor Cyan
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
    Write-Host "   WARNING: Appium server is already running on port 4723" -ForegroundColor Yellow
    Write-Host "   Stopping existing Appium to ensure driver is loaded..." -ForegroundColor Gray
    
    # Stop existing Appium
    $appiumProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            return $cmdLine -like "*appium*"
        } catch {
            return $false
        }
    }
    if ($appiumProcesses) {
        foreach ($proc in $appiumProcesses) {
            Write-Host "   Stopping Appium process (PID: $($proc.Id))..." -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Also kill processes on port 4723
    $portProcesses = Get-NetTCPConnection -LocalPort 4723 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($portProcesses) {
        foreach ($processId in $portProcesses) {
            try {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            } catch {
                # Process may have already terminated
            }
        }
    }
    
    Start-Sleep -Seconds 3
    Write-Host "   Appium stopped." -ForegroundColor Green
} else {
    Write-Host "   Appium is not running." -ForegroundColor Gray
}

Write-Host ""
Write-Host "   IMPORTANT: Appium must be started manually before running tests!" -ForegroundColor Yellow
Write-Host "   Recommended workflow:" -ForegroundColor Yellow
Write-Host "   1. In a separate terminal, run: cd mobile-app\appium_flutter_test" -ForegroundColor Gray
Write-Host "   2. Run: .\start-appium.ps1" -ForegroundColor Gray
Write-Host "   3. Wait for 'SUCCESS: Appium server started successfully!'" -ForegroundColor Gray
Write-Host "   4. Then run tests using: .\run-test.ps1 $TestFile" -ForegroundColor Gray
Write-Host ""
Write-Host "   Or continue and WebdriverIO will try to start Appium (may timeout)..." -ForegroundColor Gray
Write-Host ""
Write-Host ""

# Change to appium test directory
Set-Location "$mobileAppDir\appium_flutter_test"

# Determine which test to run
if ($TestFile -eq "") {
    Write-Host "WARNING: No test file specified. Available test files:" -ForegroundColor Yellow
    Write-Host "   - phase6_schedule_overview.spec.js" -ForegroundColor Gray
    Write-Host "   - phase6_complete_schedule_flow.spec.js" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Usage: .\build-and-test.ps1 [test-file] [-SkipBuild]" -ForegroundColor Yellow
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "   .\build-and-test.ps1 phase6_schedule_overview.spec.js" -ForegroundColor Gray
    Write-Host "   .\build-and-test.ps1 phase6_schedule_overview.spec.js -SkipBuild" -ForegroundColor Gray
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

