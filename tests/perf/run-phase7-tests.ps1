# PowerShell script to run Phase 7 k6 performance tests

param(
    [string]$TestType = "smoke",
    [string]$ApiUrl = "http://localhost:8086",
    [string]$EmployeeToken = "",
    [string]$AdminToken = ""
)

Write-Host "Phase 7 k6 Performance Testing" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""

# Check if k6 is installed
try {
    $k6Version = k6 version
    Write-Host "k6 version: $k6Version" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: k6 is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Install k6 from: https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
    exit 1
}

# Set test script based on type
$testScripts = @{
    "smoke" = "phase7-smoke.js"
    "load" = "phase7-load.js"
    "stress" = "phase7-stress.js"
    "full" = "phase7-feedback.js"
}

if (-not $testScripts.ContainsKey($TestType)) {
    Write-Host "ERROR: Invalid test type: $TestType" -ForegroundColor Red
    Write-Host "Valid types: smoke, load, stress, full" -ForegroundColor Yellow
    exit 1
}

$script = $testScripts[$TestType]

# Check if tokens are provided
if ($TestType -eq "full" -and (-not $EmployeeToken -or -not $AdminToken)) {
    Write-Host "WARNING: Full test requires both EMPLOYEE_TOKEN and ADMIN_TOKEN" -ForegroundColor Yellow
    Write-Host "You can set them as environment variables or pass as parameters" -ForegroundColor Yellow
}

# Build k6 command
$k6Cmd = "k6 run"

# Add environment variables
$k6Cmd += " --env API_BASE_URL=$ApiUrl"

if ($EmployeeToken) {
    $k6Cmd += " --env EMPLOYEE_TOKEN=$EmployeeToken"
}

if ($AdminToken) {
    $k6Cmd += " --env ADMIN_TOKEN=$AdminToken"
}

$k6Cmd += " $script"

Write-Host "Test Type: $TestType" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Cyan
Write-Host "Script: $script" -ForegroundColor Cyan
Write-Host ""
Write-Host "Running k6 test..." -ForegroundColor Green
Write-Host "Command: $k6Cmd" -ForegroundColor Gray
Write-Host ""

# Run k6
Invoke-Expression $k6Cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Test completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Test failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

