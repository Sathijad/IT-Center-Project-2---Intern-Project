# PowerShell script to run Phase 2 database migrations
# This script provides options to run migrations manually

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("info", "migrate", "repair", "verify")]
    [string]$Action = "info"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 2 Database Migration Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if database is running
Write-Host "Checking database connection..." -ForegroundColor Yellow
$dbRunning = docker ps --filter "name=itcenter_pg" --format "{{.Names}}" | Select-String "itcenter_pg"

if (-not $dbRunning) {
    Write-Host "ERROR: Database container 'itcenter_pg' is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the database first:" -ForegroundColor Yellow
    Write-Host "  docker compose -f infra/docker-compose.yml up -d" -ForegroundColor White
    exit 1
}

Write-Host "✓ Database container is running" -ForegroundColor Green
Write-Host ""

# Navigate to auth-backend
$backendPath = Join-Path $PSScriptRoot "auth-backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: auth-backend directory not found!" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

# Set JAVA_HOME if needed
$javaPath = @(
    "C:\Program Files\Java\jdk-21",
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.2+12",
    "C:\Program Files\Java\jdk-21.0.2"
) | Where-Object { Test-Path "$_\bin\java.exe" } | Select-Object -First 1

if ($javaPath) {
    $env:JAVA_HOME = $javaPath
    Write-Host "✓ JAVA_HOME set to: $javaPath" -ForegroundColor Green
} else {
    Write-Host "WARNING: Java 21 not found. Set JAVA_HOME manually if needed." -ForegroundColor Yellow
}

Write-Host ""

# Check migration files exist
$migrationPath = Join-Path $backendPath "src\main\resources\db\migration"
$v8File = Join-Path $migrationPath "V8__leave_attendance.sql"
$v9File = Join-Path $migrationPath "V9__seed_leave_policies.sql"

Write-Host "Checking migration files..." -ForegroundColor Yellow
if (-not (Test-Path $v8File)) {
    Write-Host "ERROR: V8__leave_attendance.sql not found!" -ForegroundColor Red
    Pop-Location
    exit 1
}
if (-not (Test-Path $v9File)) {
    Write-Host "ERROR: V9__seed_leave_policies.sql not found!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✓ Migration files found" -ForegroundColor Green
Write-Host ""

# Execute Flyway action
switch ($Action) {
    "info" {
        Write-Host "Getting Flyway migration info..." -ForegroundColor Cyan
        Write-Host ""
        .\mvnw.cmd flyway:info
    }
    "migrate" {
        Write-Host "Running Flyway migrations..." -ForegroundColor Cyan
        Write-Host ""
        .\mvnw.cmd flyway:migrate
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✓ Migrations completed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Verifying migration status..." -ForegroundColor Yellow
            docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT version, description, installed_on FROM flyway_schema_history WHERE version IN ('8', '9') ORDER BY installed_rank;"
        } else {
            Write-Host ""
            Write-Host "✗ Migration failed. Check errors above." -ForegroundColor Red
        }
    }
    "repair" {
        Write-Host "Repairing Flyway metadata..." -ForegroundColor Cyan
        Write-Host ""
        .\mvnw.cmd flyway:repair
    }
    "verify" {
        Write-Host "Verifying database state..." -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "1. Checking Flyway history:" -ForegroundColor Yellow
        docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT version, description, installed_on, success FROM flyway_schema_history WHERE version IN ('8', '9') ORDER BY installed_rank;"
        
        Write-Host ""
        Write-Host "2. Checking Phase 2 tables:" -ForegroundColor Yellow
        docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "\dt leave_*"
        docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "\dt attendance_*"
        
        Write-Host ""
        Write-Host "3. Checking leave policies:" -ForegroundColor Yellow
        docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT type, max_days, carry_forward FROM leave_policies;"
    }
}

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

