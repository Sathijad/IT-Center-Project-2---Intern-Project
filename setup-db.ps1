# Complete database reset script
Write-Host "Resetting database..." -ForegroundColor Yellow

# Stop and remove containers
docker stop itcenter_pg mailhog 2>$null
docker rm itcenter_pg mailhog 2>$null

# Remove volumes
docker volume rm infra_postgres_data itcenterproject_postgres_data 2>$null

# Start fresh database
Write-Host "Starting fresh database..." -ForegroundColor Green
docker compose -f infra\docker-compose.yml up -d

Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Database is ready!" -ForegroundColor Green

