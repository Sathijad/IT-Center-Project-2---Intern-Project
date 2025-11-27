# PowerShell script to run Phase 4 k6 performance tests
# Usage: .\run-phase4-tests.ps1 -BaseUrl "http://localhost:5000" -JwtToken "your-token"

param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$JwtToken = "",
    [int]$TestUserId = 1,
    [int]$TestAssigneeId = 2
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4 k6 Performance Test Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if k6 is installed
$ErrorActionPreference = "SilentlyContinue"
$k6Result = k6 version 2>&1
$ErrorActionPreference = "Continue"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ k6 found: $k6Result" -ForegroundColor Green
} else {
    Write-Host "✗ k6 not found. Please install k6 first:" -ForegroundColor Red
    Write-Host "  Windows: choco install k6" -ForegroundColor Yellow
    Write-Host "  macOS: brew install k6" -ForegroundColor Yellow
    Write-Host "  Linux: See https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
    exit 1
}

# Validate JWT token
if ([string]::IsNullOrWhiteSpace($JwtToken)) {
    Write-Host "✗ JWT token is required!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\run-phase4-tests.ps1 -BaseUrl `"http://localhost:5000`" -JwtToken `"your-jwt-token`"" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get a JWT token:" -ForegroundColor Yellow
    Write-Host "  1. Login to admin web portal" -ForegroundColor Yellow
    Write-Host "  2. Open DevTools → Application → Local Storage" -ForegroundColor Yellow
    Write-Host "  3. Copy the 'idToken' value" -ForegroundColor Yellow
    exit 1
}

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Base URL: $BaseUrl" -ForegroundColor White
Write-Host "  Test User ID: $TestUserId" -ForegroundColor White
Write-Host "  Test Assignee ID: $TestAssigneeId" -ForegroundColor White
$tokenPreview = $JwtToken.Substring(0, [Math]::Min(20, $JwtToken.Length))
Write-Host "  JWT Token: $tokenPreview..." -ForegroundColor White
Write-Host ""

# Check if test file exists
$testFile = Join-Path $PSScriptRoot "phase4.js"
if (-not (Test-Path $testFile)) {
    Write-Host "✗ Test file not found: $testFile" -ForegroundColor Red
    exit 1
}

Write-Host "Starting k6 performance tests..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:BASE_URL = $BaseUrl
$env:JWT_TOKEN = $JwtToken
$env:TEST_USER_ID = $TestUserId.ToString()
$env:TEST_ASSIGNEE_ID = $TestAssigneeId.ToString()

# Run k6 and capture exit code
k6 run $testFile
$exitCode = $LASTEXITCODE

# Clean up environment variables
Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:JWT_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:TEST_USER_ID -ErrorAction SilentlyContinue
Remove-Item Env:TEST_ASSIGNEE_ID -ErrorAction SilentlyContinue

# Display results
if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Performance tests completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results saved to:" -ForegroundColor Cyan
    Write-Host "  - phase4-perf-results.json" -ForegroundColor White
    Write-Host "  - phase4-summary.json" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "✗ Performance tests failed (exit code: $exitCode)" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

exit $exitCode
