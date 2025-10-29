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

# Always verify and set JAVA_HOME to correct path
$javaPath = Find-Java21
if ($javaPath) {
    # Override JAVA_HOME even if it's set incorrectly
    $env:JAVA_HOME = $javaPath
    Write-Host "Setting JAVA_HOME to: $env:JAVA_HOME" -ForegroundColor Green
} else {
    # Check if JAVA_HOME is already set (might be wrong path)
    if ($env:JAVA_HOME) {
        $javaExe = Join-Path $env:JAVA_HOME "bin\java.exe"
        if (Test-Path $javaExe) {
            Write-Host "Using existing JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Cyan
        } else {
            Write-Host "WARNING: JAVA_HOME points to invalid path: $env:JAVA_HOME" -ForegroundColor Red
            Write-Host "ERROR: Java 21 not found in common locations!" -ForegroundColor Red
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
}

# Verify Java installation
$javaExe = Join-Path $env:JAVA_HOME "bin\java.exe"
if (-not (Test-Path $javaExe)) {
    Write-Host "ERROR: Java not found at $env:JAVA_HOME" -ForegroundColor Red
    exit 1
}

# Function to kill processes on port 8080
function Kill-Port8080 {
    Write-Host "Checking for processes using port 8080..." -ForegroundColor Cyan
    $port = 8080
    $connections = netstat -ano | Select-String ":$port.*LISTENING"
    
    if ($connections) {
        $pids = @()
        foreach ($connection in $connections) {
            $parts = $connection.ToString().Split() | Where-Object { $_ }
            $pid = $parts[-1]
            if ($pid -and $pid -match '^\d+$') {
                $pids += [int]$pid
            }
        }
        
        $uniquePids = $pids | Select-Object -Unique
        
        if ($uniquePids.Count -gt 0) {
            foreach ($pid in $uniquePids) {
                try {
                    $process = Get-Process -Id $pid -ErrorAction Stop
                    Write-Host "Found process using port 8080: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                    Write-Host "Stopping process $pid..." -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force
                    Write-Host "Process stopped." -ForegroundColor Green
                } catch {
                    Write-Host "Process $pid not found or already terminated." -ForegroundColor Gray
                }
            }
            Start-Sleep -Seconds 2  # Give the port time to be released
            Write-Host ""
        }
    }
}

# Kill any process on port 8080 before starting
Kill-Port8080

# Set development profile explicitly
$env:SPRING_PROFILES_ACTIVE = "dev"

Write-Host "Running with profile: dev" -ForegroundColor Cyan
Write-Host "Building and running application..." -ForegroundColor Green
Write-Host ""

# Run Maven wrapper
.\mvnw.cmd clean spring-boot:run

