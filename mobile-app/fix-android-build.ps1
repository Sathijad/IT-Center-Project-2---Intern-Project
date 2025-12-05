# Fix Android Build Issues - Clean Gradle Cache and Rebuild

Write-Host "Cleaning Flutter build cache..." -ForegroundColor Yellow
flutter clean

Write-Host "Cleaning Android build directories..." -ForegroundColor Yellow
if (Test-Path "android\build") {
    Remove-Item -Recurse -Force "android\build"
}
if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build"
}

Write-Host "Cleaning Gradle cache..." -ForegroundColor Yellow
$gradleCachePath = "$env:USERPROFILE\.gradle\caches"
if (Test-Path $gradleCachePath) {
    Write-Host "Stopping all Gradle daemons..." -ForegroundColor Yellow
    cd android
    .\gradlew.bat --stop --no-daemon 2>$null
    Start-Sleep -Seconds 2
    cd ..
    
    Write-Host "Killing any Java processes that might lock files..." -ForegroundColor Yellow
    Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*gradle*" -or $_.CommandLine -like "*gradle*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    Write-Host "Removing corrupted Gradle cache (this may take a while)..." -ForegroundColor Yellow
    # Remove the entire cache directory - more aggressive approach
    if (Test-Path "$gradleCachePath\8.12") {
        Write-Host "Removing Gradle 8.12 cache..." -ForegroundColor Yellow
        # Try multiple times with delays
        for ($i = 1; $i -le 3; $i++) {
            try {
                Remove-Item -Recurse -Force "$gradleCachePath\8.12" -ErrorAction Stop
                Write-Host "Cache removed successfully." -ForegroundColor Green
                break
            } catch {
                Write-Host "Attempt $i failed, retrying..." -ForegroundColor Yellow
                Start-Sleep -Seconds 3
                Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            }
        }
    }
    # Also clear transforms which are often corrupted
    if (Test-Path "$gradleCachePath\transforms-3") {
        Remove-Item -Recurse -Force "$gradleCachePath\transforms-3" -ErrorAction SilentlyContinue
    }
    Write-Host "Gradle cache cleared." -ForegroundColor Green
}

Write-Host "Invalidating Gradle cache..." -ForegroundColor Yellow
cd android
.\gradlew.bat clean --no-daemon --no-build-cache
cd ..

Write-Host "Getting Flutter dependencies..." -ForegroundColor Yellow
flutter pub get

Write-Host "`nBuild fix complete! Try running 'flutter run' again." -ForegroundColor Green
Write-Host "If issues persist, try:" -ForegroundColor Cyan
Write-Host "  1. Close Android Studio completely" -ForegroundColor Cyan
Write-Host "  2. Run: flutter doctor -v" -ForegroundColor Cyan
Write-Host "  3. Ensure Android SDK and emulator are properly configured" -ForegroundColor Cyan

