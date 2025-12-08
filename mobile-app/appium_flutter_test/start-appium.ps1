# PowerShell script to start Appium manually
# Run this in a separate terminal before running tests

Write-Host "Starting Appium server..." -ForegroundColor Green

# Set APPIUM_HOME to current directory
$env:APPIUM_HOME = (Get-Location).Path
Write-Host "APPIUM_HOME: $env:APPIUM_HOME" -ForegroundColor Cyan

# Start Appium
appium --base-path / --relaxed-security --port 4723

