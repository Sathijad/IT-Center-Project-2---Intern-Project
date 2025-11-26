@echo off
REM Batch file to start the Phase 4 Schedules Backend
REM Usage: start-backend.bat

echo ========================================
echo Starting Phase 4 Schedules Backend
echo ========================================
echo.

cd /d "%~dp0src\Schedules.Api"

if not exist "Schedules.Api.csproj" (
    echo Error: Cannot find project file
    pause
    exit /b 1
)

echo Starting backend...
echo.
echo Backend will be available at:
echo    API: http://localhost:5166
echo    Swagger: http://localhost:5166/swagger
echo    Health: http://localhost:5166/healthz
echo.
echo Press Ctrl+C to stop the backend
echo.

dotnet run --urls "http://localhost:5166"

pause

