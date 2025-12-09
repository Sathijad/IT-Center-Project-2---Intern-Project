# PowerShell script to stop Appium server
# This will kill any Appium processes running on port 4723

Write-Host "Stopping Appium server..." -ForegroundColor Yellow
Write-Host ""

$port = 4723

# Method 1: Find processes by port and kill them
Write-Host "Method 1: Finding processes using port $port..." -ForegroundColor Cyan
try {
    $netstatOutput = netstat -ano | Select-String ":$port"
    if ($netstatOutput) {
        $netstatOutput | ForEach-Object {
            $line = $_.Line
            $parts = $line -split '\s+'
            $pid = $parts[-1]
            
            if ($pid -match '^\d+$') {
                Write-Host "  Found process with PID: $pid" -ForegroundColor Gray
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  Killing process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                        Stop-Process -Id $pid -Force -ErrorAction Stop
                        Write-Host "  [OK] Process killed" -ForegroundColor Green
                    }
                } catch {
                    Write-Host "  [WARN] Could not kill process $pid (may already be stopped)" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "  No processes found on port $port" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [ERROR] Could not check port: $_" -ForegroundColor Red
}

Write-Host ""

# Method 2: Kill all node processes (Appium runs on Node.js)
Write-Host "Method 2: Checking for Node.js processes..." -ForegroundColor Cyan
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "  Found $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Gray
        $nodeProcesses | ForEach-Object {
            Write-Host "  Killing Node.js process: PID $($_.Id)" -ForegroundColor Yellow
            try {
                Stop-Process -Id $_.Id -Force -ErrorAction Stop
                Write-Host "  [OK] Node.js process $($_.Id) killed" -ForegroundColor Green
            } catch {
                Write-Host "  [WARN] Could not kill Node.js process $($_.Id)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  No Node.js processes found" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [INFO] No Node.js processes to check" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Waiting 2 seconds for processes to terminate..." -ForegroundColor Gray
Start-Sleep -Seconds 2

# Verify port is free
Write-Host ""
Write-Host "Verifying port $port is free..." -ForegroundColor Cyan
$checkAgain = netstat -ano | Select-String ":$port"
if ($checkAgain) {
    Write-Host "  [WARN] Port $port is still in use. You may need to restart your computer or manually kill the process." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] Port $port is now free" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
