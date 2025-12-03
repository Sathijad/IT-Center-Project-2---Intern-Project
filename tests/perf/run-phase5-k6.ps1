# PowerShell script to run Phase 5 k6 performance tests
# Usage: .\run-phase5-k6.ps1

param(
    [string]$EventsApiUrl = "http://localhost:8085",
    [string]$AdminToken = "",
    [string]$EmployeeToken = "",
    [int]$VUs = 0,  # 0 means use default from script
    [string]$Duration = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 5 k6 Performance Test Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if k6 is installed
try {
    $k6Version = k6 version 2>&1
    Write-Host "✓ k6 found: $k6Version" -ForegroundColor Green
} catch {
    Write-Host "✗ k6 is not installed or not in PATH" -ForegroundColor Red
    Write-Host "  Install k6 from: https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
    Write-Host "  Windows: choco install k6" -ForegroundColor Yellow
    exit 1
}

# Check if test file exists
$testFile = Join-Path $PSScriptRoot "phase5.js"
if (-not (Test-Path $testFile)) {
    Write-Host "✗ Test file not found: $testFile" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Test file found: phase5.js" -ForegroundColor Green

# Prompt for tokens if not provided
if ([string]::IsNullOrEmpty($AdminToken)) {
    Write-Host ""
    Write-Host "Admin JWT Token is required." -ForegroundColor Yellow
    $AdminToken = Read-Host "Enter Admin JWT Token"
}

if ([string]::IsNullOrEmpty($EmployeeToken)) {
    Write-Host ""
    Write-Host "Employee JWT Token (press Enter to use Admin token):" -ForegroundColor Yellow
    $EmployeeToken = Read-Host "Enter Employee JWT Token"
    if ([string]::IsNullOrEmpty($EmployeeToken)) {
        $EmployeeToken = $AdminToken
        Write-Host "Using Admin token for Employee requests" -ForegroundColor Yellow
    }
}

# Set environment variables
$env:EVENTS_API_BASE_URL = $EventsApiUrl
$env:ADMIN_JWT_TOKEN = $AdminToken
$env:EMPLOYEE_JWT_TOKEN = $EmployeeToken

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  API URL: $EventsApiUrl" -ForegroundColor White
Write-Host "  Admin Token: $($AdminToken.Substring(0, [Math]::Min(20, $AdminToken.Length)))..." -ForegroundColor White
Write-Host "  Employee Token: $($EmployeeToken.Substring(0, [Math]::Min(20, $EmployeeToken.Length)))..." -ForegroundColor White
Write-Host ""

# Build k6 command
$k6Args = @("run")

# Add custom VUs if specified
if ($VUs -gt 0) {
    $k6Args += "--vus", $VUs.ToString()
    Write-Host "  Custom VUs: $VUs" -ForegroundColor White
}

# Add custom duration if specified
if (-not [string]::IsNullOrEmpty($Duration)) {
    $k6Args += "--duration", $Duration
    Write-Host "  Custom Duration: $Duration" -ForegroundColor White
}

$k6Args += $testFile

Write-Host "Starting k6 test..." -ForegroundColor Cyan
Write-Host "Command: k6 $($k6Args -join ' ')" -ForegroundColor Gray
Write-Host ""

# Run k6
try {
    & k6 $k6Args
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    if ($exitCode -eq 0) {
        Write-Host "✓ Test completed successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "Results saved to:" -ForegroundColor Cyan
        Write-Host "  - tests/perf/phase5-perf-results.json" -ForegroundColor White
        Write-Host "  - tests/perf/phase5-summary.json" -ForegroundColor White
    } else {
        Write-Host "✗ Test completed with errors (exit code: $exitCode)" -ForegroundColor Red
    }
    Write-Host "========================================" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "✗ Error running k6: $_" -ForegroundColor Red
    exit 1
}

exit $exitCode

