# Install Appium Drivers Script
# This script installs the required Appium drivers for Android testing

Write-Host "Installing Appium drivers..." -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Step 1: Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Installing UiAutomator2 driver for Android..." -ForegroundColor Yellow
npx appium driver install uiautomator2
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install UiAutomator2 driver!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Verifying installed drivers..." -ForegroundColor Yellow
npx appium driver list --installed

Write-Host ""
Write-Host "SUCCESS: Appium drivers installed!" -ForegroundColor Green
Write-Host "You can now run your tests." -ForegroundColor Gray
Write-Host ""

