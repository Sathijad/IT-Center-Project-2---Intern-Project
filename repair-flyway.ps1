# Flyway Repair Script
# Repairs Flyway schema history and reruns migrations

param(
    [switch]$SkipRepair = $false,
    [switch]$SkipMigrate = $false
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Flyway Repair and Migration Tool" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "auth-backend/pom.xml")) {
    Write-Host "ERROR: This script must be run from the project root directory!" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "Expected: Project root containing 'auth-backend' folder`n" -ForegroundColor Yellow
    exit 1
}

# Check if Maven wrapper exists
if (-not (Test-Path "auth-backend/mvnw.cmd")) {
    Write-Host "ERROR: Maven wrapper not found in auth-backend!" -ForegroundColor Red
    exit 1
}

Push-Location auth-backend

try {
    if (-not $SkipRepair) {
        Write-Host "[1] Running Flyway repair..." -ForegroundColor Yellow
        Write-Host "    This fixes checksum mismatches and failed migration records`n" -ForegroundColor Gray
        
        & .\mvnw.cmd flyway:repair
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`n✗ Flyway repair failed!" -ForegroundColor Red
            Write-Host "Check the error messages above.`n" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "`n✓ Flyway repair completed successfully`n" -ForegroundColor Green
    } else {
        Write-Host "[1] Skipping repair (--SkipRepair flag used)`n" -ForegroundColor Yellow
    }
    
    if (-not $SkipMigrate) {
        Write-Host "[2] Running Flyway migrate..." -ForegroundColor Yellow
        Write-Host "    This will apply any pending migrations, including V9`n" -ForegroundColor Gray
        
        & .\mvnw.cmd flyway:migrate
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`n✗ Flyway migration failed!" -ForegroundColor Red
            Write-Host "Check the error messages above.`n" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "`n✓ Flyway migration completed successfully`n" -ForegroundColor Green
    } else {
        Write-Host "[2] Skipping migrate (--SkipMigrate flag used)`n" -ForegroundColor Yellow
    }
    
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Done!" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next step: Verify tables exist:" -ForegroundColor Yellow
    Write-Host "  cd .." -ForegroundColor Cyan
    Write-Host "  .\verify-phase2-tables.ps1`n" -ForegroundColor Cyan
    
} finally {
    Pop-Location
}

