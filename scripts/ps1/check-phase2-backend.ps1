# Script to check Phase 2 backend status and diagnose issues

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Phase 2 Backend Diagnostic Check" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking if backend is running on port 3000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/healthz" -Method GET -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   [OK] Backend is running" -ForegroundColor Green
    }
} catch {
    Write-Host "   [ERROR] Backend is NOT running on port 3000" -ForegroundColor Red
    Write-Host "   Please start the backend: cd leave-attendance-backend; npm start" -ForegroundColor Yellow
}

Write-Host ""

# Check database connection
Write-Host "2. Checking database connection..." -ForegroundColor Yellow
try {
    docker exec itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT 1;" > $null
    Write-Host "   [OK] Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Cannot connect to database" -ForegroundColor Red
    Write-Host "   Please ensure PostgreSQL is running: docker compose -f infra/docker-compose.yml up -d" -ForegroundColor Yellow
}

Write-Host ""

# Check if Phase 2 tables exist
Write-Host "3. Checking if Phase 2 tables exist..." -ForegroundColor Yellow
try {
    $tables = docker exec itcenter_pg psql -U itcenter -d itcenter_auth -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('leave_policies', 'leave_requests', 'leave_balances', 'attendance_logs', 'leave_audit');"
    
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
        Write-Host "   Please run migrations: cd auth-backend; .\mvnw.cmd flyway:migrate" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [ERROR] Cannot check tables" -ForegroundColor Red
}

Write-Host ""

# Check .env file
Write-Host "4. Checking .env configuration..." -ForegroundColor Yellow
if (Test-Path "leave-attendance-backend\.env") {
    Write-Host "   [OK] .env file exists" -ForegroundColor Green
    $envContent = Get-Content "leave-attendance-backend\.env"
    $hasDbUrl = $envContent | Where-Object { $_ -match "DATABASE_URL" }
    if ($hasDbUrl) {
        Write-Host "   [OK] DATABASE_URL is configured" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] DATABASE_URL not found in .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [ERROR] .env file not found" -ForegroundColor Red
    Write-Host "   Please create leave-attendance-backend\.env file" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Diagnostic Complete" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

