# Fix JAVA_HOME System Environment Variable
# This script updates JAVA_HOME to point to the correct Java 21 installation
# 
# IMPORTANT: This script requires Administrator privileges to update system variables.
# If you can't run as admin, it will set it as a User variable instead.

Write-Host "=== Fix JAVA_HOME Environment Variable ===" -ForegroundColor Cyan
Write-Host ""

# Set the correct Java 21 path
$correctJavaHome = "C:\Program Files\Java\jdk-21"

# Verify the path exists
if (-not (Test-Path $correctJavaHome)) {
    Write-Host "ERROR: Java 21 not found at: $correctJavaHome" -ForegroundColor Red
    Write-Host "Please check your Java installation." -ForegroundColor Red
    exit 1
}

Write-Host "Found Java 21 at: $correctJavaHome" -ForegroundColor Green
Write-Host ""

# Check current values
$systemJavaHome = [Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine")
$userJavaHome = [Environment]::GetEnvironmentVariable("JAVA_HOME", "User")

Write-Host "Current JAVA_HOME values:" -ForegroundColor Cyan
if ($systemJavaHome) {
    Write-Host "  System: $systemJavaHome" -ForegroundColor $(if ($systemJavaHome -eq $correctJavaHome) { "Green" } else { "Yellow" })
} else {
    Write-Host "  System: (not set)" -ForegroundColor Gray
}
if ($userJavaHome) {
    Write-Host "  User:   $userJavaHome" -ForegroundColor $(if ($userJavaHome -eq $correctJavaHome) { "Green" } else { "Yellow" })
} else {
    Write-Host "  User:   (not set)" -ForegroundColor Gray
}
Write-Host ""

# Try to update system variable (requires admin)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "Administrator privileges detected." -ForegroundColor Green
    Write-Host "Updating JAVA_HOME system variable..." -ForegroundColor Cyan
    try {
        [Environment]::SetEnvironmentVariable("JAVA_HOME", $correctJavaHome, "Machine")
        Write-Host "JAVA_HOME system variable updated successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Failed to update system variable: $_" -ForegroundColor Yellow
        Write-Host "Falling back to user variable..." -ForegroundColor Yellow
        $isAdmin = $false
    }
} else {
    Write-Host "No Administrator privileges detected." -ForegroundColor Yellow
    Write-Host "Will set JAVA_HOME as User variable instead." -ForegroundColor Yellow
}

# Also update user variable (works without admin)
Write-Host "Updating JAVA_HOME user variable..." -ForegroundColor Cyan
try {
    [Environment]::SetEnvironmentVariable("JAVA_HOME", $correctJavaHome, "User")
    Write-Host "JAVA_HOME user variable updated successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to update user variable: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Green
Write-Host "JAVA_HOME is now set to: $correctJavaHome" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Close and reopen your terminal/PowerShell for the changes to take effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "To test immediately in this session, run:" -ForegroundColor Cyan
Write-Host '  $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"' -ForegroundColor Gray
Write-Host ""

