# PowerShell script to start the Phase 6 Performance Backend
# Usage: .\start-backend.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Phase 6 Performance Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to the API project directory
$projectPath = Join-Path $PSScriptRoot "src\Performance.Api"

if (-not (Test-Path $projectPath)) {
    Write-Host "❌ Error: Cannot find project directory: $projectPath" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath

Write-Host "📍 Project directory: $projectPath" -ForegroundColor Gray
Write-Host ""

# Check if port is already in use
$portInUse = Get-NetTCPConnection -LocalPort 5167 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Port 5167 is already in use!" -ForegroundColor Yellow
    Write-Host "   Stopping existing process..." -ForegroundColor Yellow
    $process = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $portInUse.OwningProcess -Force
        Start-Sleep -Seconds 2
    }
}

Write-Host "🚀 Starting backend..." -ForegroundColor Green
Write-Host ""
Write-Host "📝 Backend will be available at:" -ForegroundColor Cyan
Write-Host "   • API: http://localhost:5167" -ForegroundColor White
Write-Host "   • Swagger: http://localhost:5167/swagger" -ForegroundColor White
Write-Host "   • Health: http://localhost:5167/healthz" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the backend" -ForegroundColor Yellow
Write-Host ""

# Run the backend
dotnet run --urls "http://localhost:5167"

