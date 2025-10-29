# Verify and fix login_audit schema
# This script ensures the database has the correct schema for login auditing

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Login Audit Schema Verification and Fix" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Read database credentials from environment or use defaults
$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$dbName = if ($env:DB_NAME) { $env:DB_NAME } else { "itcenter_auth" }
$dbUser = if ($env:DB_USER) { $env:DB_USER } else { "itcenter" }
$dbPass = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "password" }

Write-Host "Connecting to database: $dbName on ${dbHost}:$dbPort" -ForegroundColor Yellow
Write-Host ""

# Build PGPASSWORD environment variable for psql
$env:PGPASSWORD = $dbPass

try {
    # Run the verification and fix script
    $sqlFile = Join-Path $PSScriptRoot "auth-backend\src\main\resources\db\verify_and_fix_schema.sql"
    
    if (-not (Test-Path $sqlFile)) {
        Write-Host "Error: SQL file not found at $sqlFile" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Running schema verification/fix script..." -ForegroundColor Green
    Write-Host ""
    
    # Execute the SQL script
    $result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $sqlFile 2>&1
    
    Write-Host $result -ForegroundColor White
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "Schema verification complete!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart the backend server" -ForegroundColor White
    Write-Host "2. Try logging in from web or mobile app" -ForegroundColor White
    Write-Host "3. Check the logs for [MARK-LOGIN] entries" -ForegroundColor White
    Write-Host "4. Run the SQL queries above to verify data" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "Error running schema verification: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clean up environment variable
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

