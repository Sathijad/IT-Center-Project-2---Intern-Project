# Run All Tests Script for IT Center Project
# This script runs all tests: Backend, Frontend, Mobile

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  IT Center Project - Test Runner" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Function to run a test suite
function Run-TestSuite {
    param(
        [string]$Name,
        [string]$Directory,
        [string]$Command
    )
    
    Write-Host "`n[$Name] " -ForegroundColor Yellow -NoNewline
    Write-Host "Running tests..." -ForegroundColor White
    
    Push-Location $Directory
    try {
        Invoke-Expression $Command
        Write-Host "[$Name] " -ForegroundColor Green -NoNewline
        Write-Host "Completed`n" -ForegroundColor White
    }
    catch {
        Write-Host "[$Name] " -ForegroundColor Red -NoNewline
        Write-Host "Failed: $_`n" -ForegroundColor White
    }
    finally {
        Pop-Location
    }
}

# 1. Backend Tests
Write-Host "=== BACKEND TESTS ===" -ForegroundColor Green
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'

# Check if Java is available
$javaPath = "$env:JAVA_HOME\bin\java.exe"
if (Test-Path $javaPath) {
    Run-TestSuite -Name "Backend" -Directory "auth-backend" -Command "./mvnw test -Dspring.profiles.active=test"
} else {
    Write-Host "[Backend] " -ForegroundColor Red -NoNewline
    Write-Host "Skipped - Java 21 not found at $env:JAVA_HOME`n" -ForegroundColor White
}

# 2. Frontend Tests
Write-Host "`n=== FRONTEND TESTS ===" -ForegroundColor Green
if (Test-Path "admin-web") {
    Run-TestSuite -Name "Frontend" -Directory "admin-web" -Command "npm test -- --run"
} else {
    Write-Host "[Frontend] " -ForegroundColor Red -NoNewline
    Write-Host "Skipped - admin-web directory not found`n" -ForegroundColor White
}

# 3. Mobile Tests
Write-Host "`n=== MOBILE TESTS ===" -ForegroundColor Green
if (Test-Path "mobile-app") {
    $flutterPath = Get-Command flutter -ErrorAction SilentlyContinue
    if ($flutterPath) {
        Run-TestSuite -Name "Mobile" -Directory "mobile-app" -Command "flutter test"
    } else {
        Write-Host "[Mobile] " -ForegroundColor Red -NoNewline
        Write-Host "Skipped - Flutter not found in PATH`n" -ForegroundColor White
    }
} else {
    Write-Host "[Mobile] " -ForegroundColor Red -NoNewline
    Write-Host "Skipped - mobile-app directory not found`n" -ForegroundColor White
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  All Tests Complete!" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check individual test outputs above" -ForegroundColor White
Write-Host "2. View coverage reports:" -ForegroundColor White
Write-Host "   - Backend: auth-backend/target/site/jacoco/index.html" -ForegroundColor Gray
Write-Host "   - Frontend: admin-web/coverage/index.html" -ForegroundColor Gray
Write-Host "   - Mobile: mobile-app/coverage/" -ForegroundColor Gray
Write-Host "`n3. Run Postman tests manually:" -ForegroundColor White
Write-Host "   newman run tests/postman/itcenter-auth.postman_collection.json" -ForegroundColor Gray
Write-Host "`n4. Run ZAP security scans manually" -ForegroundColor White
Write-Host "   (See HOW_TO_RUN_TESTS.md for details)`n" -ForegroundColor Gray

