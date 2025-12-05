# Aggressive Gradle Cache Fix for Windows File Locking Issues

Write-Host "=== Aggressive Gradle Cache Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop all Gradle daemons
Write-Host "Step 1: Stopping all Gradle daemons..." -ForegroundColor Yellow
cd android
.\gradlew.bat --stop --no-daemon 2>$null
cd ..
Start-Sleep -Seconds 3

# Step 2: Kill all Java processes
Write-Host "Step 2: Killing Java processes..." -ForegroundColor Yellow
Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Step 3: Close Android Studio if running (optional - user can do this manually)
Write-Host "Step 3: Checking for Android Studio..." -ForegroundColor Yellow
$studioProcesses = Get-Process -Name "studio64","studio" -ErrorAction SilentlyContinue
if ($studioProcesses) {
    Write-Host "WARNING: Android Studio is running. Please close it manually and run this script again." -ForegroundColor Red
    Write-Host "Press any key to continue anyway (not recommended)..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Step 4: Delete entire Gradle cache
Write-Host "Step 4: Deleting entire Gradle cache directory..." -ForegroundColor Yellow
$gradleCachePath = "$env:USERPROFILE\.gradle\caches"
if (Test-Path $gradleCachePath) {
    Write-Host "Deleting: $gradleCachePath" -ForegroundColor Yellow
    for ($i = 1; $i -le 5; $i++) {
        try {
            Remove-Item -Recurse -Force $gradleCachePath -ErrorAction Stop
            Write-Host "Cache deleted successfully on attempt $i" -ForegroundColor Green
            break
        } catch {
            Write-Host "Attempt $i failed: $($_.Exception.Message)" -ForegroundColor Yellow
            if ($i -lt 5) {
                Write-Host "Waiting 5 seconds before retry..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
                Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            } else {
                Write-Host "Failed to delete cache after 5 attempts." -ForegroundColor Red
                Write-Host "Please manually delete: $gradleCachePath" -ForegroundColor Red
                Write-Host "Or restart your computer and try again." -ForegroundColor Red
                exit 1
            }
        }
    }
} else {
    Write-Host "Gradle cache directory not found (already deleted?)" -ForegroundColor Green
}

# Step 5: Clean Flutter
Write-Host "Step 5: Cleaning Flutter build..." -ForegroundColor Yellow
flutter clean

# Step 6: Clean Android build directories
Write-Host "Step 6: Cleaning Android build directories..." -ForegroundColor Yellow
if (Test-Path "android\build") {
    Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue
}
if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
}

# Step 7: Get dependencies
Write-Host "Step 7: Getting Flutter dependencies..." -ForegroundColor Yellow
flutter pub get

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure Android Studio is CLOSED" -ForegroundColor White
Write-Host "2. Run: flutter run" -ForegroundColor White
Write-Host "3. If issues persist, restart your computer and try again" -ForegroundColor White


