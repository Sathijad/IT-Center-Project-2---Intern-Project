$env:SHARED_DB_HOST = "itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com"
$env:SHARED_DB_PORT = "5432"
$env:SHARED_DB_USER = "postgres"
$env:SHARED_DB_PASSWORD = "password"
$env:SHARED_DB_NAME = "itcenter_auth"
$env:SHARED_DB_SSL = "true"
$env:SHARED_DB_POOL_MAX = "10"

Write-Host "Shared DB configuration loaded from config/shared-db.ps1" -ForegroundColor Cyan

