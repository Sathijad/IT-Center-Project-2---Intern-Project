# PowerShell script to test the /api/v1/me endpoint and capture errors
# This will help identify runtime errors

$baseUrl = "http://localhost:8080"
$endpoint = "/api/v1/me"

Write-Host "Testing endpoint: $baseUrl$endpoint" -ForegroundColor Cyan
Write-Host ""

# Note: This requires a valid JWT token
# You'll need to get a token from your frontend or Cognito

Write-Host "To test this endpoint, you need:" -ForegroundColor Yellow
Write-Host "1. A valid JWT token from Cognito" -ForegroundColor Yellow
Write-Host "2. Run this command with your token:" -ForegroundColor Yellow
Write-Host ""
Write-Host '  $token = "YOUR_JWT_TOKEN_HERE"' -ForegroundColor White
Write-Host '  $headers = @{ "Authorization" = "Bearer $token" }' -ForegroundColor White
Write-Host "  Invoke-RestMethod -Uri `"$baseUrl$endpoint`" -Headers `$headers -Method Get" -ForegroundColor White
Write-Host ""
Write-Host "Or use curl:" -ForegroundColor Yellow
Write-Host "  curl -H `"Authorization: Bearer YOUR_TOKEN`" $baseUrl$endpoint" -ForegroundColor White
Write-Host ""

