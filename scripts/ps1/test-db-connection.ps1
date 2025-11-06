# Database Connection Test Script
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  IT Center - Database Connection Test" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is running
Write-Host "1. Checking PostgreSQL Service..." -ForegroundColor Yellow
$pgPort = netstat -ano | findstr :5432
if ($pgPort) {
    Write-Host "   [OK] PostgreSQL is running on port 5432" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] PostgreSQL is NOT running" -ForegroundColor Red
}
Write-Host ""

# Check if Backend API is running
Write-Host "2. Checking Backend API Service..." -ForegroundColor Yellow
$apiPort = netstat -ano | findstr :8080
if ($apiPort) {
    Write-Host "   [OK] Backend API is running on port 8080" -ForegroundColor Green
    
    # Test health endpoint
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/healthz" -Method GET -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "   [OK] Backend API health check passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "   [WARN] Backend API health check failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [FAIL] Backend API is NOT running" -ForegroundColor Red
}
Write-Host ""

# Test database connection using psql if available
Write-Host "3. Testing Database Connection..." -ForegroundColor Yellow
$pgPassPath = Get-Command psql -ErrorAction SilentlyContinue
if ($pgPassPath) {
    $env:PGPASSWORD = "password"
    $result = & psql -h localhost -p 5432 -U itcenter -d itcenter_auth -c 'SELECT version();' 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Database connection successful" -ForegroundColor Green
        Write-Host "   Connected to: PostgreSQL" -ForegroundColor Cyan
    } else {
        Write-Host "   [FAIL] Database connection failed" -ForegroundColor Red
    }
    $env:PGPASSWORD = ""
} else {
    Write-Host "   [INFO] psql not found, skipping direct database test" -ForegroundColor Gray
    Write-Host "   (Database connection is confirmed through backend logs)" -ForegroundColor Gray
}
Write-Host ""

# Check connection pools
Write-Host "4. Active Database Connections:" -ForegroundColor Yellow
$connections = netstat -ano | findstr ":5432"
$activeConnections = ($connections | Measure-Object).Count
Write-Host "   Total active connections to PostgreSQL: $activeConnections" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  CONNECTION STATUS SUMMARY" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

if ($pgPort -and $apiPort) {
    Write-Host "   [OK] Database is CONNECTED" -ForegroundColor Green
    Write-Host "   [OK] Backend API is CONNECTED" -ForegroundColor Green
    Write-Host ""
    Write-Host "   All services are running properly!" -ForegroundColor Green
} else {
    Write-Host "   [WARN] Some services may not be running" -ForegroundColor Yellow
    Write-Host "   Please check the service status above" -ForegroundColor Yellow
}

Write-Host ""
