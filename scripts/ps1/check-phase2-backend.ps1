# Script to check Phase 2 backend status and diagnose issues

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Phase 2 Backend Diagnostic Check" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

 $envFilePath = "leave-attendance-backend\.env"
 $envSettings = @{}
 if (Test-Path $envFilePath) {
     Get-Content $envFilePath | ForEach-Object {
         if ($_ -match '^\s*([^#=]+)=(.*)$') {
             $key = $matches[1].Trim()
             $value = $matches[2].Trim()
             $envSettings[$key] = $value
         }
     }
 }

# Check if backend is reachable (AWS default)
Write-Host "1. Checking Phase 2 API health..." -ForegroundColor Yellow
$leaveApiBase = $envSettings['LEAVE_API_BASE_URL']
if (-not $leaveApiBase -or $leaveApiBase.Trim().Length -eq 0) {
    $leaveApiBase = 'https://xfub6mzcqg.execute-api.ap-southeast-2.amazonaws.com'
}

try {
    $healthResponse = Invoke-WebRequest -Uri "$leaveApiBase/healthz" -Method GET -UseBasicParsing -TimeoutSec 10
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "   [OK] API reachable at $leaveApiBase" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] API responded with status $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [ERROR] Unable to reach API at $leaveApiBase" -ForegroundColor Red
    Write-Host "   Verify the API Gateway invoke URL or your network connectivity." -ForegroundColor Yellow
}

Write-Host ""

# Check database connection
Write-Host "2. Checking database connection..." -ForegroundColor Yellow
$requiredDbKeys = @('DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME')
$missingDbKeys = $requiredDbKeys | Where-Object { -not $envSettings.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($envSettings[$_]) }

if ($missingDbKeys.Count -gt 0) {
    Write-Host "   [WARN] Missing database settings in .env: $($missingDbKeys -join ', ')" -ForegroundColor Yellow
    Write-Host "   Skipping connectivity test until configuration is complete." -ForegroundColor Yellow
} else {
    $dbHost = $envSettings['DB_HOST']
    $dbPort = [int]$envSettings['DB_PORT']
    $dbUser = $envSettings['DB_USER']
    $dbPass = $envSettings['DB_PASS']
    $dbName = $envSettings['DB_NAME']

    try {
        $originalPassword = $env:PGPASSWORD
        $env:PGPASSWORD = $dbPass
        psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "SELECT 1;" > $null
        Write-Host "   [OK] Connected to $dbHost/$dbName" -ForegroundColor Green
} catch {
        Write-Host "   [ERROR] Unable to connect to $dbHost/$dbName" -ForegroundColor Red
        Write-Host "   $_" -ForegroundColor DarkRed
    } finally {
        if ($null -ne $originalPassword) {
            $env:PGPASSWORD = $originalPassword
        } else {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""

# Check if Phase 2 tables exist
Write-Host "3. Checking if Phase 2 tables exist..." -ForegroundColor Yellow
if ($missingDbKeys.Count -gt 0) {
    Write-Host "   [WARN] Skipping table check until database settings are provided." -ForegroundColor Yellow
} else {
    try {
        $originalPassword = $env:PGPASSWORD
        $env:PGPASSWORD = $envSettings['DB_PASS']
        $tableQuery = @"
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('leave_policies', 'leave_requests', 'leave_balances', 'attendance_logs', 'leave_audit');
"@
        $tables = psql -h $envSettings['DB_HOST'] -p $envSettings['DB_PORT'] -U $envSettings['DB_USER'] -d $envSettings['DB_NAME'] -t -c $tableQuery
    
    $requiredTables = @('leave_policies', 'leave_requests', 'leave_balances', 'attendance_logs', 'leave_audit')
    $missingTables = @()
    
    foreach ($table in $requiredTables) {
        if ($tables -notmatch $table) {
            $missingTables += $table
        }
    }
    
    if ($missingTables.Count -eq 0) {
        Write-Host "   [OK] All Phase 2 tables exist" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Missing tables: $($missingTables -join ', ')" -ForegroundColor Red
            Write-Host "   Apply migrations against the AWS RDS instance." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [ERROR] Cannot check tables" -ForegroundColor Red
        Write-Host "   $_" -ForegroundColor DarkRed
    } finally {
        if ($null -ne $originalPassword) {
            $env:PGPASSWORD = $originalPassword
        } else {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""

# Check .env file
Write-Host "4. Checking .env configuration..." -ForegroundColor Yellow
if ($envSettings.Count -eq 0) {
    Write-Host "   [ERROR] leave-attendance-backend\.env file not found" -ForegroundColor Red
    Write-Host "   Please create the file with AWS RDS credentials." -ForegroundColor Yellow
} else {
    Write-Host "   [OK] .env file exists" -ForegroundColor Green
    $requiredKeys = @('DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_SSL')
    $missingKeys = $requiredKeys | Where-Object { -not $envSettings.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($envSettings[$_]) }

    if ($missingKeys.Count -eq 0) {
        Write-Host "   [OK] Database configuration variables are present" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Missing keys: $($missingKeys -join ', ')" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Diagnostic Complete" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

