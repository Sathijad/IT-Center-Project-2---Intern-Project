# Connect to IT Center Database
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Connecting to IT Center Database" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "  [OK] Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "  Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker Desktop is running
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Docker Desktop is not running" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Starting Docker Desktop..." -ForegroundColor Yellow
    Write-Host "  (You may need to manually start Docker Desktop from the Start Menu)" -ForegroundColor Gray
    exit 1
}
Write-Host "  [OK] Docker Desktop is running" -ForegroundColor Green

# Check if database container exists
Write-Host ""
Write-Host "Checking database container..." -ForegroundColor Yellow
$containerExists = docker ps -a | findstr itcenter_pg
if (-not $containerExists) {
    Write-Host "  [WARN] Database container not found" -ForegroundColor Yellow
    Write-Host "  Starting database container..." -ForegroundColor Yellow
    docker compose -f infra/docker-compose.yml up -d
    Start-Sleep -Seconds 5
}

# Check if database container is running
$containerRunning = docker ps | findstr itcenter_pg
if (-not $containerRunning) {
    Write-Host "  [WARN] Database container is not running" -ForegroundColor Yellow
    Write-Host "  Starting database container..." -ForegroundColor Yellow
    docker start itcenter_pg
    Start-Sleep -Seconds 5
}

Write-Host "  [OK] Database container is running" -ForegroundColor Green

# Connect to database
Write-Host ""
Write-Host "Connecting to database..." -ForegroundColor Yellow
Write-Host "  Database: itcenter_auth" -ForegroundColor Gray
Write-Host "  Username: itcenter" -ForegroundColor Gray
Write-Host ""
Write-Host "TIP: Type \q to exit the database" -ForegroundColor Cyan
Write-Host "TIP: Type \dt to list all tables" -ForegroundColor Cyan
Write-Host ""

# Connect to database
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth
