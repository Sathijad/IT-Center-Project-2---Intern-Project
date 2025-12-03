# Events Broadcast Worker Startup Script
# Make sure to set EVENTS_SES_SENDER_EMAIL to your verified SES email address

$PWD = Get-Location

# Stop existing worker if running
docker stop events-worker 2>$null
docker rm events-worker 2>$null

Write-Host "Starting Events Broadcast Worker..." -ForegroundColor Green

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

Write-Host "Worker started! Check logs with: docker logs events-worker -f" -ForegroundColor Green

