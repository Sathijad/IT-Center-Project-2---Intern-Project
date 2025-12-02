# Unit Test Commands - Events Backend

## Quick Test Commands

### Run All Tests
```powershell
cd events-backend
docker run --rm -v ${PWD}:/app -w /app events-backend-test go test ./internal/... -v
```

### Run All Tests with Coverage
```powershell
cd events-backend
docker run --rm -v ${PWD}:/app -w /app events-backend-test go test ./internal/... -v -coverprofile=coverage.out
```

### View Coverage Report
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go tool cover -func=coverage.out
```

### Generate HTML Coverage Report
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go tool cover -html=coverage.out -o coverage.html
```

## Test Specific Packages

### Service Layer Tests
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go test ./internal/service/... -v
```

### Models Tests
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go test ./internal/models/... -v
```

### Auth/JWT Tests
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go test ./internal/auth/... -v
```

### Repository Tests
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go test ./internal/repository/... -v
```

### HTTP Handler Tests
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go test ./internal/http/... -v
```

## Run Specific Test Functions

### Run Single Test
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go test ./internal/service/... -v -run TestEventService_ListEvents
```

### Run Tests Matching Pattern
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go test ./internal/service/... -v -run TestEventService
```

## Coverage by Package

After running tests with coverage, you'll see:

```
✅ internal/models      - 100.0% coverage
✅ internal/service     - 81.4% coverage  
✅ internal/auth        - 79.2% coverage
✅ internal/repository  - 1.3% coverage (parameter validation only)
✅ internal/http        - 0.0% coverage (healthz endpoint only)
```

## Using Test Scripts

### PowerShell (Windows)
```powershell
cd events-backend
.\run-tests.ps1
```

### Bash (Linux/Mac)
```bash
cd events-backend
chmod +x run-tests.sh
./run-tests.sh
```

## Expected Test Results

All high-priority unit tests should pass:

```
✅ TestEventService_ListEvents - 8 test cases
✅ TestEventService_CreateEvent - 5 test cases
✅ TestEventService_UpdateEvent - 2 test cases
✅ TestEventService_Moderate - 4 test cases
✅ TestEventService_TagSuggestions - 3 test cases
✅ TestEventService_ListAudits - 3 test cases
✅ TestBroadcastService_Broadcast - 6 test cases
✅ TestBroadcastService_filterChannels - 5 test cases
✅ TestBroadcastService_defaultChannels - 4 test cases
✅ Repository parameter validation tests
✅ HTTP healthz endpoint test
```

## Troubleshooting

### Docker Not Running
```powershell
# Check Docker status
docker ps
```

### Rebuild Test Image
```powershell
cd events-backend
docker build -f Dockerfile.test -t events-backend-test .
```

### Clean Test Cache
```powershell
docker run --rm -v ${PWD}:/app -w /app events-backend-test go clean -testcache
```

## CI/CD Integration

For CI/CD pipelines, use:

```bash
docker build -f Dockerfile.test -t events-backend-test .
docker run --rm events-backend-test go test ./internal/... -v -coverprofile=coverage.out
docker run --rm -v $(pwd):/app -w /app events-backend-test go tool cover -func=coverage.out
```

