# Run Test Script - Assumes Appium is already running
# This script runs a specific test file, assuming Appium is already started
# Usage: .\run-test.ps1 [test-file]
# Example: .\run-test.ps1 phase6_schedule_overview.spec.js

param(
    [Parameter(Mandatory=$true)]
    [string]$TestFile
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 6: Running Appium Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileAppDir = Split-Path -Parent $scriptDir

# Change to appium test directory
Set-Location "$mobileAppDir\appium_flutter_test"

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

# Check if Appium is running
$portCheck = Get-NetTCPConnection -LocalPort 4723 -ErrorAction SilentlyContinue
if (-not $portCheck) {
    Write-Host "ERROR: Appium server is not running on port 4723!" -ForegroundColor Red
    Write-Host "   Please start Appium first:" -ForegroundColor Yellow
    Write-Host "   .\start-appium.ps1" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "SUCCESS: Appium server is running on port 4723" -ForegroundColor Green
Write-Host "Running test: $TestFile" -ForegroundColor Cyan
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
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""


