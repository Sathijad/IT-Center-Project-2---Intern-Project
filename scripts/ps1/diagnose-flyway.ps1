# Comprehensive Flyway Diagnostic Script
# Checks all common issues that prevent migrations from running or tables from appearing

param(
    [string]$Host = "localhost",
    [int]$Port = 5432,
    [string]$Database = "itcenter_auth",
    [string]$User = "itcenter",
    [string]$Password = "password",
    [string]$Schema = "public"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Flyway Migration Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$tables = @('attendance_logs', 'leave_requests', 'leave_audit', 'leave_balances', 'leave_policies')
$allOk = $true

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "ERROR: psql not found in PATH!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools or add psql to your PATH.`n" -ForegroundColor Yellow
    exit 1
}

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $Password

Write-Host "[1] Checking database connection..." -ForegroundColor Yellow
$dbCheck = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT current_database(), current_schema();" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Cannot connect to database!" -ForegroundColor Red
    Write-Host "  Error: $dbCheck" -ForegroundColor Red
    Write-Host "`n  Check:" -ForegroundColor Yellow
    Write-Host "    - PostgreSQL is running" -ForegroundColor White
    Write-Host "    - Database '$Database' exists" -ForegroundColor White
    Write-Host "    - User '$User' has access" -ForegroundColor White
    Write-Host "    - Connection details are correct`n" -ForegroundColor White
    $allOk = $false
} else {
    $dbInfo = $dbCheck -split "`n" | Where-Object { $_.Trim() -ne '' }
    Write-Host "  ✓ Connected successfully" -ForegroundColor Green
    Write-Host "    Database: $($dbInfo[0])" -ForegroundColor Gray
    Write-Host "    Current Schema: $($dbInfo[1])`n" -ForegroundColor Gray
}

if (-not $allOk) { exit 1 }

Write-Host "[2] Checking Flyway schema history table..." -ForegroundColor Yellow
$historyExists = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='$Schema' AND table_name='flyway_schema_history');" 2>&1
if ($historyExists -eq "t") {
    Write-Host "  ✓ flyway_schema_history table exists`n" -ForegroundColor Green
    
    Write-Host "[3] Checking Flyway migration history..." -ForegroundColor Yellow
    $historyQuery = @"
SELECT 
    installed_rank,
    version,
    description,
    type,
    script,
    installed_by,
    installed_on,
    success,
    checksum
FROM flyway_schema_history
ORDER BY installed_rank;
"@
    
    $history = & psql -h $Host -p $Port -U $User -d $Database -t -A -F "|" -c $historyQuery 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Migration History:" -ForegroundColor Cyan
        $historyLines = $history | Where-Object { $_.Trim() -ne '' }
        if ($historyLines.Count -eq 0) {
            Write-Host "    No migrations found in history!`n" -ForegroundColor Yellow
        } else {
            foreach ($line in $historyLines) {
                $fields = $line -split '\|'
                if ($fields.Count -ge 8) {
                    $rank = $fields[0].Trim()
                    $version = $fields[1].Trim()
                    $desc = $fields[2].Trim()
                    $type = $fields[3].Trim()
                    $script = $fields[4].Trim()
                    $success = $fields[7].Trim()
                    
                    $statusColor = if ($success -eq "t") { "Green" } else { "Red" }
                    $status = if ($success -eq "t") { "✓" } else { "✗" }
                    
                    Write-Host "    $status V$version - $desc" -ForegroundColor $statusColor
                    Write-Host "      Script: $script" -ForegroundColor Gray
                    Write-Host "      Success: $success" -ForegroundColor $(if ($success -eq "t") { "Green" } else { "Red" })
                    
                    if ($success -eq "f") {
                        Write-Host "      ⚠️  This migration FAILED! Run repair:" -ForegroundColor Red
                        Write-Host "         cd auth-backend && mvn flyway:repair && mvn flyway:migrate" -ForegroundColor Yellow
                        $allOk = $false
                    }
                    
                    if ($version -eq "9") {
                        Write-Host "      ℹ️  V9 migration found!" -ForegroundColor Cyan
                    }
                }
            }
            Write-Host ""
        }
        
        # Check specifically for V9
        $v9Check = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT COUNT(*) FROM flyway_schema_history WHERE version='9';" 2>&1
        if ($v9Check -eq "0") {
            Write-Host "  ⚠️  V9 migration NOT found in history!" -ForegroundColor Yellow
            Write-Host "     This means V9 hasn't run yet.`n" -ForegroundColor Yellow
            Write-Host "     Possible reasons:" -ForegroundColor Yellow
            Write-Host "     1. File not found: Check that V9__recreate_phase2_tables.sql exists in" -ForegroundColor White
            Write-Host "        auth-backend/src/main/resources/db/migration/" -ForegroundColor White
            Write-Host "     2. Flyway disabled: Check spring.flyway.enabled=true" -ForegroundColor White
            Write-Host "     3. Wrong classpath: Check spring.flyway.locations=classpath:db/migration" -ForegroundColor White
            Write-Host "     4. Target version set: Check spring.flyway.target (should be empty or >= 9)`n" -ForegroundColor White
            $allOk = $false
        } else {
            $v9Success = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT success FROM flyway_schema_history WHERE version='9' ORDER BY installed_rank DESC LIMIT 1;" 2>&1
            if ($v9Success -eq "t") {
                Write-Host "  ✓ V9 migration completed successfully`n" -ForegroundColor Green
            } else {
                Write-Host "  ✗ V9 migration FAILED!`n" -ForegroundColor Red
                $allOk = $false
            }
        }
    } else {
        Write-Host "  ✗ Error reading history: $history`n" -ForegroundColor Red
        $allOk = $false
    }
} else {
    Write-Host "  ⚠️  flyway_schema_history table does not exist!" -ForegroundColor Yellow
    Write-Host "     This means Flyway has never run on this database.`n" -ForegroundColor Yellow
    Write-Host "     Run: cd auth-backend && mvn flyway:migrate" -ForegroundColor Cyan
    Write-Host "     OR start the Spring Boot app (Flyway runs automatically)`n" -ForegroundColor Cyan
}

Write-Host "[4] Checking for Phase 2 tables in schema '$Schema'..." -ForegroundColor Yellow
$missingTables = @()
foreach ($table in $tables) {
    $existsQuery = "SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='$Schema' AND tablename='$table');"
    $exists = & psql -h $Host -p $Port -U $User -d $Database -t -A -c $existsQuery 2>&1
    
    if ($exists -eq "t") {
        Write-Host "  ✓ $Schema.$table exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $Schema.$table MISSING" -ForegroundColor Red
        $missingTables += $table
        $allOk = $false
    }
}
Write-Host ""

if ($missingTables.Count -gt 0) {
    Write-Host "[5] Checking other schemas for tables..." -ForegroundColor Yellow
    $allSchemas = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT DISTINCT schemaname FROM pg_tables WHERE tablename IN ('$($tables -join ''',''')');" 2>&1
    if ($allSchemas -and $LASTEXITCODE -eq 0) {
        $schemaList = $allSchemas | Where-Object { $_.Trim() -ne '' } | ForEach-Object { $_.Trim() }
        if ($schemaList.Count -gt 0) {
            Write-Host "  Found tables in other schemas:" -ForegroundColor Yellow
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
            Write-Host "     Check Spring Boot config for spring.flyway.schemas" -ForegroundColor White
            Write-Host "     Or check pgAdmin in the schema where tables were found.`n" -ForegroundColor White
        }
    }
}

Write-Host "[6] Checking database connection details..." -ForegroundColor Yellow
$currentDb = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT current_database();" 2>&1
$currentSchema = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT current_schema();" 2>&1
$searchPath = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SHOW search_path;" 2>&1

Write-Host "  Current Database: $currentDb" -ForegroundColor Gray
Write-Host "  Current Schema: $currentSchema" -ForegroundColor Gray
Write-Host "  Search Path: $searchPath" -ForegroundColor Gray
Write-Host "  Expected Schema: $Schema`n" -ForegroundColor Gray

if ($currentSchema -ne $Schema) {
    Write-Host "  ⚠️  Current schema differs from expected!" -ForegroundColor Yellow
    Write-Host "     Make sure you're checking the correct schema in pgAdmin.`n" -ForegroundColor Yellow
}

Write-Host "[7] Checking migration file exists..." -ForegroundColor Yellow
$migrationFile = "auth-backend/src/main/resources/db/migration/V9__recreate_phase2_tables.sql"
if (Test-Path $migrationFile) {
    Write-Host "  ✓ Migration file exists: $migrationFile" -ForegroundColor Green
    $fileContent = Get-Content $migrationFile -Raw
    if ($fileContent -match "CREATE TABLE IF NOT EXISTS leave_policies") {
        Write-Host "  ✓ File contains expected table creation statements`n" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  File content may be incorrect`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ Migration file NOT found: $migrationFile" -ForegroundColor Red
    Write-Host "     This is why V9 cannot run!`n" -ForegroundColor Red
    $allOk = $false
}

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Diagnostic Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($allOk -and $missingTables.Count -eq 0) {
    Write-Host "✓ All checks passed! Tables should be visible.`n" -ForegroundColor Green
} else {
    Write-Host "✗ Issues found. See recommendations below.`n" -ForegroundColor Red
    
    Write-Host "Recommended Actions:" -ForegroundColor Yellow
    Write-Host ""
    
    if ($missingTables.Count -gt 0) {
        Write-Host "1. Run Flyway migration:" -ForegroundColor Cyan
        Write-Host "   cd auth-backend" -ForegroundColor White
        Write-Host "   mvn flyway:migrate" -ForegroundColor White
        Write-Host ""
        Write-Host "   OR start Spring Boot app (migrations run automatically):" -ForegroundColor White
        Write-Host "   cd auth-backend" -ForegroundColor White
        Write-Host "   .\mvnw spring-boot:run" -ForegroundColor White
        Write-Host ""
    }
    
    if ($historyExists -eq "t") {
        $failedMigrations = & psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT COUNT(*) FROM flyway_schema_history WHERE success=false;" 2>&1
        if ($failedMigrations -gt 0) {
            Write-Host "2. Repair failed migrations:" -ForegroundColor Cyan
            Write-Host "   cd auth-backend" -ForegroundColor White
            Write-Host "   mvn flyway:repair" -ForegroundColor White
            Write-Host "   mvn flyway:migrate" -ForegroundColor White
            Write-Host ""
        }
    }
    
    Write-Host "3. Verify tables after migration:" -ForegroundColor Cyan
    Write-Host "   .\verify-phase2-tables.ps1" -ForegroundColor White
    Write-Host ""
}

# Cleanup
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

