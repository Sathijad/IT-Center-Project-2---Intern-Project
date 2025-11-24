# Fix Amplify Build Errors Script
# This script cleans and rebuilds the Flutter project to fix Amplify plugin issues

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Amplify Build Errors" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Cleaning Flutter build..." -ForegroundColor Yellow
flutter clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: flutter clean failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Removing build directories..." -ForegroundColor Yellow
Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android\app\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android\app\src\main\java\io\flutter\plugins\GeneratedPluginRegistrant.java" -Force -ErrorAction SilentlyContinue
Write-Host "Build directories removed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Getting Flutter dependencies..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: flutter pub get failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Cleaning Android Gradle build..." -ForegroundColor Yellow
cd android
if (Test-Path "gradlew.bat") {
    .\gradlew.bat clean
} else {
    Write-Host "gradlew.bat not found, skipping Gradle clean" -ForegroundColor Yellow
}
cd ..

Write-Host ""
Write-Host "Step 5: Rebuilding APK (this may take a few minutes)..." -ForegroundColor Yellow
flutter build apk --debug
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. Try these additional steps:" -ForegroundColor Red
    Write-Host "1. Delete .dart_tool directory: Remove-Item -Path .dart_tool -Recurse -Force" -ForegroundColor Yellow
    Write-Host "2. Delete pub cache: flutter pub cache repair" -ForegroundColor Yellow
    Write-Host "3. Run flutter doctor to check for issues" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Build fix complete! APK created successfully." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "APK location: build\app\outputs\flutter-apk\app-debug.apk" -ForegroundColor Cyan

