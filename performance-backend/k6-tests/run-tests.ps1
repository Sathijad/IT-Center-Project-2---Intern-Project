# PowerShell script to run k6 performance tests
# Usage: .\run-tests.ps1 [test-name] [base-url] [auth-token]

param(
    [Parameter(Position=0)]
    [string]$TestName = "smoke",
    
    [Parameter(Position=1)]
    [string]$BaseUrl = "http://localhost:5167",
    
    [Parameter(Position=2)]
    [string]$AuthToken = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "k6 Performance Testing - Phase 6" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if k6 is installed
$k6Installed = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6Installed) {
    Write-Host "ERROR: k6 is not installed!" -ForegroundColor Red
    Write-Host "Install k6 using: choco install k6" -ForegroundColor Yellow
    Write-Host "Or download from: https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
    exit 1
}

Write-Host "k6 Version: " -NoNewline
k6 version
Write-Host ""

# Set environment variables
$env:BASE_URL = $BaseUrl
if ($AuthToken) {
    $env:AUTH_TOKEN = $AuthToken
    Write-Host "Using provided AUTH_TOKEN" -ForegroundColor Green
} else {
    Write-Host "WARNING: No AUTH_TOKEN provided. Tests may fail authentication." -ForegroundColor Yellow
    Write-Host "Set AUTH_TOKEN environment variable or pass as parameter." -ForegroundColor Yellow
}
Write-Host "BASE_URL: $BaseUrl" -ForegroundColor Green
Write-Host ""

# Determine test file
$testFile = switch ($TestName.ToLower()) {
    "smoke" { "tests/smoke.js" }
    "metrics" { "tests/performance-metrics.js" }
    "crud" { "tests/performance-crud.js" }
    "training" { "tests/training.js" }
    "mixed" { "tests/mixed-load.js" }
    default { 
        Write-Host "ERROR: Unknown test name: $TestName" -ForegroundColor Red
        Write-Host "Available tests: smoke, metrics, crud, training, mixed" -ForegroundColor Yellow
        exit 1
    }
}

if (-not (Test-Path $testFile)) {
    Write-Host "ERROR: Test file not found: $testFile" -ForegroundColor Red
    exit 1
}

Write-Host "Running test: $testFile" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Run the test
k6 run $testFile

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test completed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

