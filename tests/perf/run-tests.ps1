# PowerShell script to run k6 performance tests for Phase 3 Booking API
# Usage: .\run-tests.ps1 -TestType <smoke|full> -ApiUrl <url> -EmployeeToken <token> -AdminToken <token>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("smoke", "full")]
    [string]$TestType = "smoke",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "",
    
    [Parameter(Mandatory=$false)]
    [string]$EmployeeToken = "",
    
    [Parameter(Mandatory=$false)]
    [string]$AdminToken = ""
)

# Check if k6 is installed
$k6Installed = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6Installed) {
    Write-Host "Error: k6 is not installed. Please install k6 first." -ForegroundColor Red
    Write-Host "Installation: choco install k6" -ForegroundColor Yellow
    exit 1
}

# Determine test file
$testFile = if ($TestType -eq "smoke") { "booking-k6-smoke.js" } else { "booking-k6.js" }

# Check if test file exists
if (-not (Test-Path $testFile)) {
    Write-Host "Error: Test file $testFile not found" -ForegroundColor Red
    exit 1
}

# Build k6 command
$k6Command = "k6 run $testFile"

# Add environment variables
$envVars = @()

if ($ApiUrl) {
    $envVars += "--env API_BASE_URL=$ApiUrl"
} else {
    Write-Host "Warning: API_BASE_URL not provided. Using default from test file." -ForegroundColor Yellow
}

if ($EmployeeToken) {
    $envVars += "--env EMPLOYEE_TOKEN=$EmployeeToken"
    if ($TestType -eq "smoke") {
        $envVars += "--env AUTH_TOKEN=$EmployeeToken"
    }
}

if ($AdminToken) {
    $envVars += "--env ADMIN_TOKEN=$AdminToken"
}

# Combine command
$fullCommand = "$k6Command $($envVars -join ' ')"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running k6 Performance Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Type: $TestType" -ForegroundColor Green
Write-Host "Test File: $testFile" -ForegroundColor Green
if ($ApiUrl) {
    Write-Host "API URL: $ApiUrl" -ForegroundColor Green
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Run k6
Invoke-Expression $fullCommand

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test completed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

