# Install k6 for Windows
# Downloads k6 from official releases

Write-Host "Installing k6..." -ForegroundColor Green

$k6Version = "v0.48.0"
$k6Url = "https://github.com/grafana/k6/releases/download/$k6Version/k6-$k6Version-windows-amd64.zip"
$tempDir = "$env:TEMP\k6-install"
$k6Dir = "$env:USERPROFILE\k6"

# Create temp directory
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Download k6
Write-Host "Downloading k6 $k6Version..." -ForegroundColor Yellow
$zipPath = "$tempDir\k6.zip"
Invoke-WebRequest -Uri $k6Url -OutFile $zipPath

# Extract
Write-Host "Extracting k6..." -ForegroundColor Yellow
Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

# Create k6 directory
New-Item -ItemType Directory -Force -Path $k6Dir | Out-Null

# Copy k6.exe
Copy-Item "$tempDir\k6-$k6Version-windows-amd64\k6.exe" -Destination "$k6Dir\k6.exe" -Force

# Add to PATH (current session)
$env:Path += ";$k6Dir"

# Add to PATH permanently (user scope)
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$k6Dir*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$k6Dir", "User")
    Write-Host "Added k6 to PATH (requires new terminal session)" -ForegroundColor Yellow
}

# Cleanup
Remove-Item $tempDir -Recurse -Force

Write-Host "k6 installed successfully!" -ForegroundColor Green
Write-Host "Location: $k6Dir\k6.exe" -ForegroundColor Cyan
Write-Host "`nNote: You may need to restart your terminal for PATH changes to take effect." -ForegroundColor Yellow
Write-Host "Verify installation: k6 version" -ForegroundColor Cyan

