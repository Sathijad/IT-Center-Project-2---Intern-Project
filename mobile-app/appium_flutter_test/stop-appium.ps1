# Stop Appium Server Script
# This script stops any running Appium server instances

Write-Host "Stopping Appium server..." -ForegroundColor Cyan

# Find and stop Appium processes
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
    Write-Host "SUCCESS: Appium processes stopped" -ForegroundColor Green
} else {
    Write-Host "INFO: No Appium processes found" -ForegroundColor Gray
}

# Also check for processes using port 4723
$portProcesses = Get-NetTCPConnection -LocalPort 4723 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($portProcesses) {
    foreach ($processId in $portProcesses) {
        try {
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
                $procName = $proc.ProcessName
                Write-Host "   Stopping process using port 4723 (PID: $processId, Name: $procName)..." -ForegroundColor Gray
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        } catch {
            # Process may have already terminated
        }
    }
    Write-Host "SUCCESS: Port 4723 freed" -ForegroundColor Green
} else {
    Write-Host "INFO: Port 4723 is not in use" -ForegroundColor Gray
}

# Wait a moment for processes to fully terminate
Start-Sleep -Seconds 2

# Verify port is free
$portCheck = Get-NetTCPConnection -LocalPort 4723 -ErrorAction SilentlyContinue
if (-not $portCheck) {
    Write-Host "SUCCESS: Appium server stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Port 4723 may still be in use. You may need to manually kill the process." -ForegroundColor Yellow
}

Write-Host ""

