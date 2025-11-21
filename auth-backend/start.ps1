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

# Load shared database configuration (if available)
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sharedDbScript = Join-Path $scriptRoot "..\config\shared-db.ps1"

if (Test-Path $sharedDbScript) {
    Write-Host "Loading shared database configuration..." -ForegroundColor Cyan
    Write-Host "Config file path: $sharedDbScript" -ForegroundColor Gray
    . $sharedDbScript

    if ($env:SHARED_DB_HOST) {
        $sharedDbPort = if ($env:SHARED_DB_PORT) { $env:SHARED_DB_PORT } else { "5432" }
        $sharedDbName = if ($env:SHARED_DB_NAME) { $env:SHARED_DB_NAME } else { "itcenter_auth" }
        
        # Build JDBC URL with SSL and timeout parameters for RDS
        $sslMode = if ($env:SHARED_DB_SSL -and $env:SHARED_DB_SSL.ToLower() -eq "true") { 
            "?sslmode=require&sslfactory=org.postgresql.ssl.NonValidatingFactory&connectTimeout=60&socketTimeout=60" 
        } else { 
            "?connectTimeout=60&socketTimeout=60" 
        }

        $env:SPRING_DATASOURCE_URL = "jdbc:postgresql://$($env:SHARED_DB_HOST):$sharedDbPort/$sharedDbName$sslMode"
        $env:SPRING_DATASOURCE_USERNAME = $env:SHARED_DB_USER
        $env:SPRING_DATASOURCE_PASSWORD = $env:SHARED_DB_PASSWORD
        $env:SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE = if ($env:SHARED_DB_POOL_MAX) { $env:SHARED_DB_POOL_MAX } else { "10" }
        
        # Increase connection timeout for RDS (in milliseconds)
        $env:SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT = "60000"

        Write-Host "Spring datasource configured for shared RDS:" -ForegroundColor Green
        Write-Host "  Database: $sharedDbName" -ForegroundColor Gray
        Write-Host "  Host: $($env:SHARED_DB_HOST):$sharedDbPort" -ForegroundColor Gray
        Write-Host "  User: $($env:SPRING_DATASOURCE_USERNAME)" -ForegroundColor Gray
        Write-Host "  SSL: Enabled" -ForegroundColor Gray
        Write-Host "  Connection Timeout: 60 seconds" -ForegroundColor Gray
    } else {
        if ($env:SPRING_DATASOURCE_URL) {
            Write-Host "SPRING_DATASOURCE_URL already set, skipping override." -ForegroundColor Yellow
        } else {
            Write-Host "Shared DB script loaded but SHARED_DB_HOST not set. Skipping datasource override." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Shared database configuration not found at: $sharedDbScript" -ForegroundColor Yellow
    Write-Host "Using default datasource configuration (localhost)." -ForegroundColor Yellow
}

# Test database connectivity if RDS is configured
if ($env:SHARED_DB_HOST) {
    Write-Host "Testing database connectivity..." -ForegroundColor Cyan
    try {
        $port = if ($env:SHARED_DB_PORT) { $env:SHARED_DB_PORT } else { "5432" }
        $testConnection = Test-NetConnection -ComputerName $env:SHARED_DB_HOST -Port $port -WarningAction SilentlyContinue -ErrorAction Stop
        
        if ($testConnection.TcpTestSucceeded) {
            Write-Host "[OK] Database host is reachable on port $port" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Cannot reach database host $($env:SHARED_DB_HOST):$port" -ForegroundColor Red
            Write-Host "  This may be due to:" -ForegroundColor Yellow
            Write-Host "  1. RDS Security Group not allowing your IP address" -ForegroundColor Yellow
            Write-Host "  2. Firewall blocking outbound connections" -ForegroundColor Yellow
            Write-Host "  3. RDS instance is not publicly accessible" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "  Continuing anyway - Spring Boot will attempt connection..." -ForegroundColor Yellow
            Write-Host ""
        }
    } catch {
        Write-Host "[INFO] Could not test connectivity (this is OK, Spring Boot will try anyway)" -ForegroundColor Gray
    }
}

# Set development profile explicitly
$env:SPRING_PROFILES_ACTIVE = "dev"

Write-Host "Running with profile: dev" -ForegroundColor Cyan
Write-Host "Building and running application..." -ForegroundColor Green
Write-Host ""

# Run Maven wrapper
.\mvnw.cmd clean spring-boot:run

