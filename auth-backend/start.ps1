# PowerShell script to start the Spring Boot application

Write-Host "Starting Spring Boot Application..." -ForegroundColor Green
Write-Host ""

# Function to find Java installation
function Find-Java21 {
    $possiblePaths = @(
        "C:\Program Files\Java\jdk-21",
        "C:\Program Files\Eclipse Adoptium\jdk-21.0.2+12",
        "C:\Program Files\Java\jdk-21.0.2",
        "C:\Program Files\OpenJDK\openjdk-21"
    )
    
    foreach ($path in $possiblePaths) {
        $javaExe = Join-Path $path "bin\java.exe"
        if (Test-Path $javaExe) {
            return $path
        }
    }
    
    return $null
}

# Set JAVA_HOME if not already set
if (-not $env:JAVA_HOME) {
    $javaPath = Find-Java21
    if ($javaPath) {
        $env:JAVA_HOME = $javaPath
        Write-Host "Found Java 21 at: $env:JAVA_HOME" -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: Java 21 not found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Java 21 from:" -ForegroundColor Yellow
        Write-Host "https://www.oracle.com/java/technologies/downloads/#java21"
        Write-Host ""
        Write-Host "Or set JAVA_HOME manually using:" -ForegroundColor Yellow
        Write-Host '  $env:JAVA_HOME = "C:\Path\To\Java\jdk-21"'
        Write-Host ""
        exit 1
    }
} else {
    Write-Host "Using existing JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Cyan
}

# Verify Java installation
$javaExe = Join-Path $env:JAVA_HOME "bin\java.exe"
if (-not (Test-Path $javaExe)) {
    Write-Host "ERROR: Java not found at $env:JAVA_HOME" -ForegroundColor Red
    exit 1
}

# Set development profile explicitly
$env:SPRING_PROFILES_ACTIVE = "dev"

Write-Host ""
Write-Host "Running with profile: dev" -ForegroundColor Cyan
Write-Host "Building and running application..." -ForegroundColor Green
Write-Host ""

# Run Maven wrapper
.\mvnw.cmd clean spring-boot:run

