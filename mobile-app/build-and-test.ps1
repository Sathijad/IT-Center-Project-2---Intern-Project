# Wrapper script for Appium tests
# This script calls the build-and-test.ps1 script in appium_flutter_test directory
# Usage: .\build-and-test.ps1 [test-file] [-SkipBuild]
# Examples:
#   .\build-and-test.ps1 phase6_schedule_overview.spec.js
#   .\build-and-test.ps1 phase6_schedule_overview.spec.js -SkipBuild

param(
    [Parameter(Mandatory=$false)]
    [string]$TestFile = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false
)

# Get the script directory (mobile-app)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$testScriptPath = Join-Path $scriptDir "appium_flutter_test\build-and-test.ps1"

# Check if the test script exists
if (-not (Test-Path $testScriptPath)) {
    Write-Host "Error: Test script not found at $testScriptPath" -ForegroundColor Red
    exit 1
}

# Call the test script with arguments
$params = @{}
if ($TestFile -ne "") {
    $params['TestFile'] = $TestFile
}
if ($SkipBuild) {
    $params['SkipBuild'] = $true
}

& $testScriptPath @params

