# PowerShell script to monitor auth backend logs for errors in real-time
# Run this while making requests to /api/v1/me to see runtime errors

$logFile = "logs\auth-api.log"

if (-not (Test-Path $logFile)) {
    Write-Host "Log file not found: $logFile" -ForegroundColor Red
    Write-Host "Make sure the auth backend is running and has created the log file." -ForegroundColor Yellow
    exit 1
}

Write-Host "Monitoring log file: $logFile" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""

# Get initial file size
$lastSize = (Get-Item $logFile).Length

# Tail the log file and filter for errors
Get-Content $logFile -Wait -Tail 0 | ForEach-Object {
    $line = $_
    
    # Check for error patterns
    if ($line -match "ERROR|Exception|Failed|Runtime error|Stack trace") {
        Write-Host $line -ForegroundColor Red
    } elseif ($line -match "WARN") {
        Write-Host $line -ForegroundColor Yellow
    } elseif ($line -match "DEBUG.*user|DEBUG.*profile|DEBUG.*JWT") {
        Write-Host $line -ForegroundColor Cyan
    }
}

