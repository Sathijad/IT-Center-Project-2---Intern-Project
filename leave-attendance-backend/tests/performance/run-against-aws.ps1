# Run k6 Performance Test Against AWS API
# Usage: .\run-against-aws.ps1 -ApiUrl "https://your-api.execute-api.ap-southeast-2.amazonaws.com" -AccessToken "your-token"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$AccessToken,
    
    [string]$AdminToken = "",
    [string]$Scenario = "comprehensive"
)

Write-Host "`n=== Running k6 Performance Test Against AWS ===" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Yellow
Write-Host "Scenario: $Scenario" -ForegroundColor Yellow
Write-Host ""

# Add k6 to PATH
$env:Path += ";$env:USERPROFILE\k6"

# Set environment variables
$env:API_BASE_URL = $ApiUrl
$env:ACCESS_TOKEN = $AccessToken
if ($AdminToken) {
    $env:ADMIN_TOKEN = $AdminToken
} else {
    $env:ADMIN_TOKEN = $AccessToken
}

# Determine test script
$testScript = "phase2-comprehensive-test.js"
if ($Scenario -eq "smoke") {
    $testScript = "scenarios/smoke-test.js"
} elseif ($Scenario -eq "load") {
    $testScript = "scenarios/load-test.js"
} elseif ($Scenario -eq "stress") {
    $testScript = "scenarios/stress-test.js"
} elseif ($Scenario -eq "spike") {
    $testScript = "scenarios/spike-test.js"
}

# Generate output filename
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = "aws-performance-$Scenario-$timestamp.json"

Write-Host "Running k6 test..." -ForegroundColor Green
Write-Host "Output file: $outputFile`n" -ForegroundColor Gray

# Run k6 test
try {
    k6 run $testScript --out json=$outputFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ k6 test completed successfully!" -ForegroundColor Green
        
        # Convert to Allure
        Write-Host "`nConverting to Allure format..." -ForegroundColor Cyan
        node k6-to-allure.js $outputFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Conversion successful!" -ForegroundColor Green
            Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
            Write-Host "   cd .." -ForegroundColor White
            Write-Host "   npm run allure:generate" -ForegroundColor White
            Write-Host "   npm run allure:open" -ForegroundColor White
        } else {
            Write-Host "`n❌ Conversion failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "`n❌ k6 test failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    exit 1
}


