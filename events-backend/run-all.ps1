# Events Backend - Start All Services
# This script starts both the Events API and the Broadcast Worker

$PWD = Get-Location

Write-Host "Starting Events Backend Services..." -ForegroundColor Green

# Stop existing containers if running
Write-Host "`nStopping existing containers (if running)..." -ForegroundColor Yellow
docker stop events-api events-worker 2>$null
docker rm events-api events-worker 2>$null

Write-Host "`n1. Starting Events API (port 8085)..." -ForegroundColor Yellow
docker run -d --name events-api `
  -v "${PWD}:/app" `
  -w /app `
  -p 8085:8080 `
  -e EVENTS_DB_URL="postgres://postgres:password@itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com:5432/itcenter_auth?sslmode=require" `
  -e EVENTS_JWKS_URL="https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y/.well-known/jwks.json" `
  -e EVENTS_JWT_ISSUER="https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y" `
  -e EVENTS_JWT_AUDIENCE="3rdnl5ind8guti89jrbob85r4i" `
  -e EVENTS_ALLOWED_ORIGINS="*" `
  -e EVENTS_SQS_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/144395889864/events-broadcast-queue" `
  -e AWS_REGION="ap-southeast-2" `
  -e AWS_ACCESS_KEY_ID="$env:AWS_ACCESS_KEY_ID" `
  -e AWS_SECRET_ACCESS_KEY="$env:AWS_SECRET_ACCESS_KEY" `
  golang:1.23 `
  go run ./cmd/api

if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Events API started successfully" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Failed to start Events API" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Starting Events Broadcast Worker..." -ForegroundColor Yellow
docker run -d --name events-worker `
  -v "${PWD}:/app" `
  -w /app `
  -e EVENTS_DB_URL="postgres://postgres:password@itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com:5432/itcenter_auth?sslmode=require" `
  -e EVENTS_JWKS_URL="https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y/.well-known/jwks.json" `
  -e EVENTS_JWT_ISSUER="https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y" `
  -e EVENTS_JWT_AUDIENCE="3rdnl5ind8guti89jrbob85r4i" `
  -e EVENTS_SQS_QUEUE_URL="https://sqs.ap-southeast-2.amazonaws.com/144395889864/events-broadcast-queue" `
  -e EVENTS_SES_SENDER_EMAIL="sathija.d@eyepax.com" `
  -e EVENTS_EMAIL_ENABLED="true" `
  -e EVENTS_EMAIL_TEST_MODE="true" `
  -e EVENTS_PUSH_ENABLED="false" `
  -e EVENTS_TEAMS_ENABLED="false" `
  -e AWS_REGION="ap-southeast-2" `
  -e AWS_ACCESS_KEY_ID="$env:AWS_ACCESS_KEY_ID" `
  -e AWS_SECRET_ACCESS_KEY="$env:AWS_SECRET_ACCESS_KEY" `
  golang:1.23 `
  go run ./cmd/broadcast-worker

if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Events Worker started successfully" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Failed to start Events Worker" -ForegroundColor Red
    exit 1
}

Write-Host "`n[SUCCESS] All services started successfully!" -ForegroundColor Green
Write-Host "`nQuick Commands:" -ForegroundColor Cyan
Write-Host "   Check status:  docker ps | findstr events" -ForegroundColor Gray
Write-Host "   API logs:      docker logs events-api -f" -ForegroundColor Gray
Write-Host "   Worker logs:   docker logs events-worker -f" -ForegroundColor Gray
Write-Host "   Stop all:      docker stop events-api events-worker" -ForegroundColor Gray
Write-Host "`nAPI is running on: http://localhost:8085" -ForegroundColor Cyan

