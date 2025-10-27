@echo off
REM This script sets up JAVA_HOME and starts the Spring Boot application

REM Check if JAVA_HOME is set
if "%JAVA_HOME%"=="" (
    set JAVA_HOME=C:\Program Files\Java\jdk-21
)

REM Check if JAVA_HOME\bin\java.exe exists
if not exist "%JAVA_HOME%\bin\java.exe" (
    echo.
    echo ERROR: Java 21 not found at %JAVA_HOME%
    echo.
    echo Trying to find Java 21 automatically...
    echo.
    
    REM Try to find Java in common locations
    if exist "C:\Program Files\Java\jdk-21\bin\java.exe" (
        set JAVA_HOME=C:\Program Files\Java\jdk-21
        echo Found Java at: %JAVA_HOME%
    ) else if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.2+12\bin\java.exe" (
        set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.2+12
        echo Found Java at: %JAVA_HOME%
    ) else (
        echo.
        echo Please install Java 21 from:
        echo https://www.oracle.com/java/technologies/downloads/#java21
        echo.
        echo Or set JAVA_HOME manually:
        echo set JAVA_HOME=C:\Path\To\Java\jdk-21
        echo.
        pause
        exit /b 1
    )
)

echo Starting Spring Boot application...
echo JAVA_HOME=%JAVA_HOME%
echo.

REM Set development profile explicitly
set SPRING_PROFILES_ACTIVE=dev

echo.
echo Running with profile: dev
echo.

REM Build and run
mvnw.cmd spring-boot:run
