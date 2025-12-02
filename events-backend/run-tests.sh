#!/bin/bash
# Bash script to run Go tests using Docker

echo "Running Go tests with Docker..."
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "ERROR: Docker is not running or not installed!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "Building test image..."
docker build -f Dockerfile.test -t events-backend-test .

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build test image!"
    exit 1
fi

echo ""
echo "Running tests..."
echo ""

docker run --rm -v "$(pwd):/app" -w /app events-backend-test go test -v -coverprofile=coverage.out ./...

if [ $? -eq 0 ]; then
    echo ""
    echo "Tests completed successfully!"
    
    # Show coverage if coverage.out exists
    if [ -f "coverage.out" ]; then
        echo ""
        echo "Generating coverage report..."
        docker run --rm -v "$(pwd):/app" -w /app events-backend-test go tool cover -func=coverage.out | grep total
    fi
else
    echo ""
    echo "Tests failed!"
    exit 1
fi


