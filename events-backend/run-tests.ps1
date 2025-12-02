# PowerShell script to run Go tests using Docker

Write-Host "Running Go tests with Docker..." -ForegroundColor Green
Write-Host ""

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running or not installed!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Building test image..." -ForegroundColor Cyan
docker build -f Dockerfile.test -t events-backend-test .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build test image!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Running tests..." -ForegroundColor Cyan
Write-Host ""

docker run --rm -v "${PWD}:/app" -w /app events-backend-test go test -v -coverprofile=coverage.out ./...

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Tests completed successfully!" -ForegroundColor Green
    
    # Show coverage if coverage.out exists
    if (Test-Path "coverage.out") {
        Write-Host ""
        Write-Host "Generating coverage report..." -ForegroundColor Cyan
        docker run --rm -v "${PWD}:/app" -w /app events-backend-test go tool cover -func=coverage.out | Select-String "total:"
    }
} else {
    Write-Host ""
    Write-Host "Tests failed!" -ForegroundColor Red
    exit 1
}


