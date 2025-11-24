# Manual Appium Start Script
# Use this if the automatic Appium service fails to start

Write-Host "Starting Appium server manually..." -ForegroundColor Yellow
Write-Host "Keep this window open while running tests" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop Appium" -ForegroundColor Cyan
Write-Host ""

# Start Appium with proper configuration for Appium 3.x
# Using / as base path for Flutter driver compatibility
# Port 4723 is the standard Appium port
Write-Host "Starting Appium server on port 4723..." -ForegroundColor Cyan
Write-Host "Base path: /" -ForegroundColor Cyan
Write-Host ""
appium --base-path / --allow-cors --log-level info --relaxed-security --port 4723

