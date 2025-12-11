# Start Appium Server Script
# This script starts the Appium server on port 4723

Write-Host "Starting Appium server..." -ForegroundColor Cyan

# Check if Appium is already running
$appiumProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
        return $cmdLine -like "*appium*"
    } catch {
        return $false
    }
}
if ($appiumProcesses) {
    $appiumProcess = $appiumProcesses | Select-Object -First 1
    Write-Host "WARNING: Appium server is already running (PID: $($appiumProcess.Id))" -ForegroundColor Yellow
    Write-Host "   If you need to restart, run: .\stop-appium.ps1 first" -ForegroundColor Gray
    exit 0
}

# Check if port 4723 is in use
$portInUse = Get-NetTCPConnection -LocalPort 4723 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "WARNING: Port 4723 is already in use!" -ForegroundColor Yellow
    Write-Host "   Run: .\stop-appium.ps1 to free the port" -ForegroundColor Gray
    exit 1
}

# Start Appium server
Write-Host "   Starting Appium on http://127.0.0.1:4723..." -ForegroundColor Gray
Write-Host "   This may take 30-60 seconds..." -ForegroundColor Gray

# Get the script directory to find node_modules
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appiumPath = Join-Path $scriptDir "node_modules\.bin\appium.cmd"

if (Test-Path $appiumPath) {
    # Use the local appium installation
    Start-Process -FilePath $appiumPath -WindowStyle Normal
} else {
    # Fallback to npx
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k npx appium" -WindowStyle Normal
}

# Wait for Appium to start (check every 2 seconds, up to 60 seconds)
$maxWait = 60
$waited = 0
$started = $false

while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
    
    $portCheck = Get-NetTCPConnection -LocalPort 4723 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "SUCCESS: Appium server started successfully! (took $waited seconds)" -ForegroundColor Green
        Write-Host "   Server running on http://127.0.0.1:4723" -ForegroundColor Gray
        $started = $true
        break
    }
    
    if ($waited % 10 -eq 0) {
        Write-Host "   Still waiting... ($waited / $maxWait seconds)" -ForegroundColor Gray
    }
}

if (-not $started) {
    Write-Host "WARNING: Appium may still be starting. Check the Appium window for status." -ForegroundColor Yellow
    Write-Host "   You can verify with: netstat -an | findstr 4723" -ForegroundColor Gray
}

Write-Host ""
Write-Host "To stop Appium, run: .\stop-appium.ps1" -ForegroundColor Gray

