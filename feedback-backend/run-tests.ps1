# PowerShell script to run PHPUnit tests

Write-Host "Running PHPUnit tests for Phase 7 Feedback Backend..." -ForegroundColor Green
Write-Host ""

# Run all tests
php vendor/bin/phpunit

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "All tests passed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Some tests failed. Exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}


