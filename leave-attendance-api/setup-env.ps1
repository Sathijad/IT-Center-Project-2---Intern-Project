# PowerShell script to create .env file for leave-attendance-api
# This script creates the .env file with all required values from Phase 1

Write-Host "Setting up .env file for Leave & Attendance API..." -ForegroundColor Cyan
Write-Host ""

$envContent = @"
# Server Configuration
NODE_ENV=development
PORT=8082

# Database Configuration (Same as Phase 1)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itcenter_auth
DB_USER=itcenter
DB_PASSWORD=password
DB_MAX_CLIENTS=20
DB_IDLE_TIMEOUT_MS=30000

# AWS Cognito Configuration (Same as Phase 1)
COGNITO_USER_POOL_ID=ap-southeast-2_hTAYJId8y
COGNITO_CLIENT_ID=3rdnl5ind8guti89jrbob85r4i
COGNITO_REGION=ap-southeast-2
COGNITO_ISSUER=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y
COGNITO_JWK_SET_URI=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y/.well-known/jwks.json
JWKS_CACHE_TTL=600
CLOCK_SKEW_SECONDS=120

# Feature Flags
ENABLE_GEO_VALIDATION=false
ENABLE_CALENDAR_SYNC=true

# Microsoft Graph (Optional - Leave empty for now)
MSGRAPH_TENANT_ID=
MSGRAPH_CLIENT_ID=
MSGRAPH_CLIENT_SECRET=

# AWS SES (Optional - Leave empty for now)
SES_REGION=ap-southeast-2
SES_FROM_EMAIL=noreply@yourdomain.tld

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
"@

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host "WARNING: .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Skipped. Existing .env file preserved." -ForegroundColor Yellow
        exit 0
    }
}

$envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline

Write-Host ".env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "File location: $envPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration summary:" -ForegroundColor Yellow
Write-Host "  - Database: localhost:5432/itcenter_auth (same as Phase 1)" -ForegroundColor White
Write-Host "  - Cognito: ap-southeast-2_hTAYJId8y (same as Phase 1)" -ForegroundColor White
Write-Host "  - Port: 8082 (Node.js API)" -ForegroundColor White
Write-Host ""
Write-Host "You can now start the API with: npm run dev" -ForegroundColor Green
