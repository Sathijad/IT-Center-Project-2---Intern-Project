# Script to kill the process using port 8080
# Usage: .\kill-port-8080.ps1

Write-Host "Checking for processes using port 8080..." -ForegroundColor Cyan

$port = 8080
$connections = netstat -ano | Select-String ":$port.*LISTENING"

if ($connections) {
    $pids = @()
    foreach ($connection in $connections) {
        $parts = $connection.ToString().Split() | Where-Object { $_ }
        $pid = $parts[-1]
        if ($pid -and $pid -match '^\d+$') {
            $pids += [int]$pid
        }
    }
    
    $uniquePids = $pids | Select-Object -Unique
    
    if ($uniquePids.Count -gt 0) {
        foreach ($pid in $uniquePids) {
            try {
                $process = Get-Process -Id $pid -ErrorAction Stop
                Write-Host "Found process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                Write-Host "  Path: $($process.Path)" -ForegroundColor Gray
                Write-Host "Killing process $pid..." -ForegroundColor Red
                Stop-Process -Id $pid -Force
                Write-Host "Process $pid killed successfully." -ForegroundColor Green
            } catch {
                Write-Host "Process $pid not found or already terminated." -ForegroundColor Yellow
            }
        }
        Write-Host "`nPort 8080 is now free." -ForegroundColor Green
    } else {
        Write-Host "No process found using port 8080." -ForegroundColor Green
    }
} else {
    Write-Host "Port 8080 is free." -ForegroundColor Green
}

