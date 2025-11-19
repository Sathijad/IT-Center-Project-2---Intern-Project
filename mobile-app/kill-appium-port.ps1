# Kill any process using Appium port 4723
Write-Host "Checking for processes on port 4723..." -ForegroundColor Yellow

try {
    $connection = Get-NetTCPConnection -LocalPort 4723 -ErrorAction SilentlyContinue
    if ($connection) {
        $processId = $connection.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Found process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Red
            Write-Host "Killing process..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Write-Host "Process killed successfully!" -ForegroundColor Green
        }
    } else {
        Write-Host "No process found on port 4723" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking port: $_" -ForegroundColor Red
}

# Also try to kill any Appium processes by name
Write-Host "Checking for Appium processes..." -ForegroundColor Yellow
$appiumProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*appium*" -or (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*appium*"
}

if ($appiumProcesses) {
    foreach ($proc in $appiumProcesses) {
        Write-Host "Killing Appium process: PID $($proc.Id)" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "Appium processes killed!" -ForegroundColor Green
} else {
    Write-Host "No Appium processes found" -ForegroundColor Green
}

Write-Host "Done!" -ForegroundColor Green

