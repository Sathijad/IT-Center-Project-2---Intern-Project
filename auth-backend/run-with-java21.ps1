# Helper script to run Maven commands with correct JAVA_HOME
# Usage: .\run-with-java21.ps1 [maven-command]
# Example: .\run-with-java21.ps1 spring-boot:run

# Set JAVA_HOME to correct path (overrides any incorrect system variable)
$correctJavaHome = "C:\Program Files\Java\jdk-21"

if (Test-Path "$correctJavaHome\bin\java.exe") {
    $env:JAVA_HOME = $correctJavaHome
    Write-Host "Using JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
    
    # Check if running spring-boot:run and kill port 8080 if needed
    $isSpringBootRun = $false
    if ($args.Count -gt 0) {
        $mavenArgs = $args -join " "
        if ($mavenArgs -match "spring-boot:run") {
            $isSpringBootRun = $true
        }
    } else {
        $isSpringBootRun = $true
    }
    
    if ($isSpringBootRun) {
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
                        Write-Host "Stopping process on port 8080: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                        Stop-Process -Id $pid -Force
                        Write-Host "Process stopped." -ForegroundColor Green
                    } catch {
                        Write-Host "Process $pid not found." -ForegroundColor Gray
                    }
                }
                Start-Sleep -Seconds 2
            }
        }
    }
    
    # Run the Maven command with any arguments passed
    if ($args.Count -gt 0) {
        $mavenArgs = $args -join " "
        & .\mvnw.cmd $mavenArgs
    } else {
        # Default to spring-boot:run if no arguments provided
        Write-Host "Running: .\mvnw.cmd spring-boot:run" -ForegroundColor Cyan
        & .\mvnw.cmd spring-boot:run
    }
} else {
    Write-Host "ERROR: Java 21 not found at: $correctJavaHome" -ForegroundColor Red
    Write-Host "Please verify your Java 21 installation." -ForegroundColor Yellow
    exit 1
}

