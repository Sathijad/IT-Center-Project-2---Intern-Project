# Verify Phase 2 Leave & Attendance Tables
# This script checks if the 5 required tables exist in the same database/schema that Spring Boot uses

param(
    [string]$Host = "localhost",
    [int]$Port = 5432,
    [string]$Database = "itcenter_auth",
    [string]$User = "itcenter",
    [string]$Password = "password",
    [string]$Schema = "public"  # Default schema, can be overridden if Spring uses a different one
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Phase 2 Tables Verification" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$tables = @('attendance_logs', 'leave_requests', 'leave_audit', 'leave_balances', 'leave_policies')

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "ERROR: psql not found in PATH!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools or use pgAdmin to run the query manually.`n" -ForegroundColor Yellow
    exit 1
}

# Set PGPASSWORD for psql
$env:PGPASSWORD = $Password

# First, check what database and schema we're actually connected to
Write-Host "Checking database connection..." -ForegroundColor Yellow
$dbInfo = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT current_database(), current_schema();" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Cannot connect to database!" -ForegroundColor Red
    Write-Host "  Error: $dbInfo" -ForegroundColor Red
    Write-Host "`n  Check:" -ForegroundColor Yellow
    Write-Host "    - PostgreSQL is running" -ForegroundColor White
    Write-Host "    - Database '$Database' exists" -ForegroundColor White
    Write-Host "    - User '$User' has access`n" -ForegroundColor White
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    exit 1
}

$dbInfoParts = $dbInfo -split "`n" | Where-Object { $_.Trim() -ne '' }
$actualDb = $dbInfoParts[0].Trim()
$actualSchema = $dbInfoParts[1].Trim()

Write-Host "  ✓ Connected to database: $actualDb" -ForegroundColor Green
Write-Host "  Current schema: $actualSchema" -ForegroundColor Green
Write-Host "  Checking schema: $Schema`n" -ForegroundColor Green

# Check if tables exist in the specified schema
Write-Host "Checking for Phase 2 tables in schema '$Schema'..." -ForegroundColor Yellow
$allOk = $true
$foundTables = @()
$missingTables = @()

foreach ($table in $tables) {
    $existsQuery = "SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='$Schema' AND tablename='$table');"
    $exists = & psql -h $Host -p $Port -U $User -d $Database -t -A -c $existsQuery 2>&1
    
    if ($exists -eq "t") {
        Write-Host "  ✓ $Schema.$table" -ForegroundColor Green
        $foundTables += $table
    } else {
        Write-Host "  ✗ $Schema.$table - MISSING" -ForegroundColor Red
        $missingTables += $table
        $allOk = $false
    }
}

Write-Host ""

# If tables are missing, check other schemas
if ($missingTables.Count -gt 0) {
    Write-Host "Checking other schemas for missing tables..." -ForegroundColor Yellow
    $allSchemas = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT DISTINCT schemaname FROM pg_tables WHERE tablename IN ('$($tables -join ''',''')') ORDER BY schemaname;" 2>&1
    
    if ($allSchemas -and $LASTEXITCODE -eq 0) {
        $schemaList = $allSchemas | Where-Object { $_.Trim() -ne '' } | ForEach-Object { $_.Trim() }
        if ($schemaList.Count -gt 0) {
            Write-Host "  Found tables in other schemas:" -ForegroundColor Cyan
            foreach ($otherSchema in $schemaList) {
                if ($otherSchema -ne $Schema) {
                    Write-Host "    Schema: $otherSchema" -ForegroundColor Cyan
                    foreach ($table in $tables) {
                        $existsQuery = "SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='$otherSchema' AND tablename='$table');"
                        $exists = & psql -h $Host -p $Port -U $User -d $Database -t -A -c $existsQuery 2>&1
                        if ($exists -eq "t") {
                            Write-Host "      ✓ $otherSchema.$table" -ForegroundColor Green
                        }
                    }
                }
            }
            Write-Host ""
            Write-Host "  ⚠️  Tables exist in a different schema!" -ForegroundColor Yellow
            Write-Host "     Check Spring Boot config: spring.flyway.schemas" -ForegroundColor White
            Write-Host "     Or check pgAdmin in the schema where tables were found.`n" -ForegroundColor White
        }
    }
}

# Check Flyway history for V9
Write-Host "Checking Flyway migration history..." -ForegroundColor Yellow
$historyExists = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='$Schema' AND table_name='flyway_schema_history');" 2>&1

if ($historyExists -eq "t") {
    $v9Check = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT version, success FROM flyway_schema_history WHERE version='9' ORDER BY installed_rank DESC LIMIT 1;" 2>&1
    
    if ($v9Check -and $v9Check.Trim() -ne '') {
        $v9Parts = $v9Check -split '\|'
        $v9Success = $v9Parts[1].Trim()
        
        if ($v9Success -eq "t") {
            Write-Host "  ✓ V9 migration completed successfully" -ForegroundColor Green
        } else {
            Write-Host "  ✗ V9 migration FAILED" -ForegroundColor Red
            Write-Host "     Run: cd auth-backend && mvn flyway:repair && mvn flyway:migrate" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  V9 migration not found in history" -ForegroundColor Yellow
        Write-Host "     V9 may not have run yet.`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Flyway history table not found" -ForegroundColor Yellow
    Write-Host "     Flyway may not have run yet.`n" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Found: $($foundTables.Count)/$($tables.Count) tables" -ForegroundColor $(if ($allOk) { "Green" } else { "Yellow" })

if ($allOk) {
    Write-Host "✓ All Phase 2 tables exist in schema '$Schema'!`n" -ForegroundColor Green
} else {
    Write-Host "✗ Missing tables: $($missingTables -join ', ')`n" -ForegroundColor Red
    
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Run comprehensive diagnostic:" -ForegroundColor Cyan
    Write-Host "   .\diagnose-flyway.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Run Flyway migration:" -ForegroundColor Cyan
    Write-Host "   cd auth-backend" -ForegroundColor White
    Write-Host "   mvn flyway:migrate" -ForegroundColor White
    Write-Host ""
    Write-Host "   OR start Spring Boot app (migrations run automatically):" -ForegroundColor White
    Write-Host "   cd auth-backend" -ForegroundColor White
    Write-Host "   .\mvnw spring-boot:run" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Verify again after migration:" -ForegroundColor Cyan
    Write-Host "   .\verify-phase2-tables.ps1`n" -ForegroundColor White
}

# Cleanup
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

