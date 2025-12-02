# Testing Guide - Events Backend

This document describes how to run unit tests for the events-backend service.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)

## Running Tests

### Option 1: Using PowerShell Script (Windows)

```powershell
cd events-backend
.\run-tests.ps1
```

### Option 2: Using Bash Script (Linux/Mac)

```bash
cd events-backend
chmod +x run-tests.sh
./run-tests.sh
```

### Option 3: Using Docker Compose

```bash
cd events-backend
docker-compose -f docker-compose.test.yml up --build
```

### Option 4: Using Docker Directly

```bash
cd events-backend

# Build test image
docker build -f Dockerfile.test -t events-backend-test .

# Run tests
docker run --rm -v "$(pwd):/app" -w /app events-backend-test go test -v ./...

# Run tests with coverage
docker run --rm -v "$(pwd):/app" -w /app events-backend-test go test -v -coverprofile=coverage.out ./...

# View coverage report
docker run --rm -v "$(pwd):/app" -w /app events-backend-test go tool cover -func=coverage.out
```

## Test Structure

Tests are organized by package:

- `internal/service/events_test.go` - EventService unit tests
- `internal/service/broadcast_test.go` - BroadcastService unit tests
- `internal/auth/jwt_test.go` - JWT authentication tests
- `internal/models/event_test.go` - Model validation tests

## Test Coverage

The tests use Testify for assertions and mocking. Coverage reports are generated in `coverage.out`.

To view coverage in HTML format:

```bash
docker run --rm -v "$(pwd):/app" -w /app events-backend-test go tool cover -html=coverage.out -o coverage.html
```

Then open `coverage.html` in your browser.

## Running Specific Tests

To run tests for a specific package:

```bash
docker run --rm -v "$(pwd):/app" -w /app events-backend-test go test -v ./internal/service/...
```

To run a specific test:

```bash
docker run --rm -v "$(pwd):/app" -w /app events-backend-test go test -v -run TestEventService_CreateEvent ./internal/service/...
```

## Troubleshooting

### Docker not running
If you see "Docker is not running", start Docker Desktop and wait for it to fully start.

### Permission denied (Linux/Mac)
Make the script executable:
```bash
chmod +x run-tests.sh
```

### Tests fail with import errors
Run `go mod tidy` in Docker:
```bash
docker run --rm -v "$(pwd):/app" -w /app events-backend-test go mod tidy
```

## Continuous Integration

For CI/CD pipelines, use:

```bash
docker build -f Dockerfile.test -t events-backend-test .
docker run --rm events-backend-test go test -v -coverprofile=coverage.out ./...
```


