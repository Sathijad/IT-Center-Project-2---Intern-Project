# Complete Gradle Cache Fix - Following User's Method
# Note: This should be run as Administrator for best results

Write-Host "=== Complete Gradle Cache Fix ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all Java/Gradle processes
Write-Host "Step 1: Closing anything that might lock Gradle..." -ForegroundColor Yellow
Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "gradle*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "All Java/Gradle processes stopped." -ForegroundColor Green

# Step 2: Check and fix read-only on .gradle folder
Write-Host "Step 2: Checking and fixing read-only attributes..." -ForegroundColor Yellow
$gradleFolder = "$env:USERPROFILE\.gradle"
if (Test-Path $gradleFolder) {
    try {
        $attr = (Get-Item $gradleFolder -Force).Attributes
        if ($attr -band [System.IO.FileAttributes]::ReadOnly) {
            Set-ItemProperty -Path $gradleFolder -Name Attributes -Value ($attr -band (-bnot [System.IO.FileAttributes]::ReadOnly)) -Force
            Write-Host "Removed read-only from .gradle folder" -ForegroundColor Green
        }
        # Also fix read-only on caches folder
        $cachesFolder = "$gradleFolder\caches"
        if (Test-Path $cachesFolder) {
            Get-ChildItem -Path $cachesFolder -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
                try {
                    $_.Attributes = $_.Attributes -band (-bnot [System.IO.FileAttributes]::ReadOnly)
                } catch {
                    # Ignore errors on individual files
                }
            }
            Write-Host "Removed read-only from cache files" -ForegroundColor Green
        }
    } catch {
        Write-Host "Warning: Could not fix read-only attributes: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "You may need to run this script as Administrator" -ForegroundColor Yellow
    }
}

# Step 3: Delete the broken Gradle cache
Write-Host "Step 3: Deleting broken Gradle cache (8.12 folder)..." -ForegroundColor Yellow
$gradleCache = "$env:USERPROFILE\.gradle\caches\8.12"
if (Test-Path $gradleCache) {
    try {
        # Try to delete with multiple attempts
        for ($i = 1; $i -le 3; $i++) {
            try {
                Remove-Item -Path $gradleCache -Recurse -Force -ErrorAction Stop
                Write-Host "Successfully deleted Gradle cache 8.12 folder (attempt $i)" -ForegroundColor Green
                break
            } catch {
                if ($i -eq 3) {
                    Write-Host "Failed to delete after 3 attempts: $($_.Exception.Message)" -ForegroundColor Red
                    Write-Host "Please run PowerShell as Administrator and try again" -ForegroundColor Red
                    Write-Host "Or manually delete: $gradleCache" -ForegroundColor Red
                } else {
                    Write-Host "Attempt $i failed, retrying in 2 seconds..." -ForegroundColor Yellow
                    Start-Sleep -Seconds 2
                    Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {
        Write-Host "Error deleting cache: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Gradle cache 8.12 folder not found (already deleted?)" -ForegroundColor Yellow
}

# Step 4: Clean Flutter project
Write-Host "Step 4: Cleaning Flutter project..." -ForegroundColor Yellow
flutter clean

# Step 5: Get dependencies
Write-Host "Step 5: Getting Flutter dependencies..." -ForegroundColor Yellow
flutter pub get

Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Try building with:" -ForegroundColor Cyan
Write-Host "  flutter build apk --debug" -ForegroundColor White
Write-Host "  or" -ForegroundColor White
Write-Host "  flutter run" -ForegroundColor White


