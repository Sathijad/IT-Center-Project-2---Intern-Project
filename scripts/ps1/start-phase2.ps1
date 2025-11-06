# Phase 2 - Leave & Attendance Management Startup Script
# This script starts all required services for Phase 2

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Phase 2 - Leave & Attendance Management" -ForegroundColor Cyan
Write-Host "  Starting Services..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Start Infrastructure (PostgreSQL)
Write-Host "1. Starting Infrastructure (PostgreSQL)..." -ForegroundColor Yellow
docker compose -f infra/docker-compose.yml up -d
Start-Sleep -Seconds 3
Write-Host "   [OK] Infrastructure started" -ForegroundColor Green
Write-Host ""

# Step 2: Run Database Migrations
Write-Host "2. Running Database Migrations..." -ForegroundColor Yellow
cd auth-backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
.\mvnw.cmd flyway:migrate
cd ..
Write-Host "   [OK] Migrations completed" -ForegroundColor Green
Write-Host ""

# Step 3: Start Phase 1 Auth Backend (Spring Boot)
Write-Host "3. Starting Phase 1 Auth Backend (Spring Boot)..." -ForegroundColor Yellow
Write-Host "   Starting in new window..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\auth-backend'; `$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'; .\start.ps1"
Start-Sleep -Seconds 5
Write-Host "   [OK] Auth backend starting (check http://localhost:8080/healthz)" -ForegroundColor Green
Write-Host ""

# Step 4: Setup Phase 2 Backend Environment
Write-Host "4. Setting up Phase 2 Backend Environment..." -ForegroundColor Yellow
cd leave-attendance-backend

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "   Creating .env file..." -ForegroundColor Gray
    @"
DATABASE_URL=postgresql://itcenter:password@localhost:5432/itcenter_auth
COGNITO_ISSUER_URI=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y
CORS_ORIGINS=http://localhost:5173
GEO_VALIDATION_ENABLED=true
OFFICE_LATITUDE=-37.8136
OFFICE_LONGITUDE=144.9631
GEOFENCE_RADIUS_METERS=1000
NODE_ENV=development
"@ | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "   [OK] .env file created" -ForegroundColor Green
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing Node.js dependencies..." -ForegroundColor Gray
    npm install
}

cd ..
Write-Host ""

# Step 5: Start Phase 2 Leave/Attendance Backend
Write-Host "5. Starting Phase 2 Leave/Attendance Backend..." -ForegroundColor Yellow
Write-Host "   Starting in new window..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\leave-attendance-backend'; if (Test-Path '.env') { Get-Content '.env' | ForEach-Object { if (`$_ -match '^([^=]+)=(.*)$') { [System.Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2], 'Process') } } }; npm start"
Start-Sleep -Seconds 3
Write-Host "   [OK] Leave/Attendance backend starting (check http://localhost:3000/healthz)" -ForegroundColor Green
Write-Host "   Note: If using SAM CLI: sam local start-api --port 3000" -ForegroundColor Gray
Write-Host ""

# Step 6: Start React Admin Portal
Write-Host "6. Starting React Admin Portal..." -ForegroundColor Yellow
Write-Host "   Starting in new window..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\admin-web'; npm run dev"
Start-Sleep -Seconds 3
Write-Host "   [OK] Admin portal starting (check http://localhost:5173)" -ForegroundColor Green
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  All Services Started!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
Write-Host "  - PostgreSQL:        localhost:5432" -ForegroundColor White
Write-Host "  - Auth Backend:      http://localhost:8080" -ForegroundColor White
Write-Host "  - Leave/Attend API:  http://localhost:3000" -ForegroundColor White
Write-Host "  - Admin Portal:      http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Note: Make sure to update admin-web/src/config/env.ts" -ForegroundColor Yellow
Write-Host "      with correct API_BASE_URL for Phase 2 backend" -ForegroundColor Yellow
Write-Host ""

