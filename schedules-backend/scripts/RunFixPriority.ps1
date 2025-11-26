# Simple script to run the priority constraint fix
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Priority Constraint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$sqlFile = "migrations\fix_priority_constraint.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Please run this SQL manually in pgAdmin:" -ForegroundColor Yellow
Write-Host ""
Get-Content $sqlFile | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
Write-Host ""
Write-Host "Or use this simplified SQL:" -ForegroundColor Yellow
Write-Host "   ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_chk_priority;" -ForegroundColor White
Write-Host "   ALTER TABLE tasks ADD CONSTRAINT tasks_chk_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent', 'Critical'));" -ForegroundColor White

