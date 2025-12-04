# Performance API Unit Tests

This project contains comprehensive xUnit unit tests for the Phase 6 Performance & Training Module.

## Test Structure

### Services Tests
- **KpiServiceTests** - Tests for KPI CRUD operations
- **MetricsServiceTests** - Tests for KPI metrics snapshot and time-series queries
- **KpiTargetServiceTests** - Tests for KPI target management
- **KpiActualServiceTests** - Tests for KPI actual value management
- **TrainingCourseServiceTests** - Tests for training course CRUD operations
- **TrainingAssignmentServiceTests** - Tests for training assignment management
- **ImportServiceTests** - Tests for import job management
- **NotificationServiceTests** - Tests for notification queuing

### Controllers Tests
- **PerformanceControllerTests** - Tests for performance metrics endpoints

### Workers Tests
- **KpiImportWorkerTests** - Tests for CSV import processing
- **TrainingNotificationWorkerTests** - Tests for training notification sending

### Helpers
- **TestDbContextFactory** - Factory for creating in-memory database contexts
- **TestDataBuilder** - Builder methods for creating test entities
- **ControllerTestHelpers** - Utilities for setting up controller tests

## Running Tests

### Using .NET CLI
```bash
cd performance-backend/src/Performance.Api.Tests
dotnet test
```

### Using Visual Studio
1. Open the solution in Visual Studio
2. Right-click on the test project
3. Select "Run Tests"

### Running Specific Tests
```bash
# Run tests for a specific class
dotnet test --filter "FullyQualifiedName~KpiServiceTests"

# Run tests matching a pattern
dotnet test --filter "FullyQualifiedName~ServiceTests"
```

### With Code Coverage
```bash
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover
```

## Test Coverage

The tests cover:
- ✅ All service methods (CRUD operations, queries, validations)
- ✅ Controller endpoints (success and error cases)
- ✅ Background workers (import processing, notifications)
- ✅ Edge cases (not found, validation errors, null handling)
- ✅ Business logic (target prioritization, filtering, date ranges)

## Test Patterns

### Service Tests
- Use in-memory database for isolation
- Test both success and failure scenarios
- Verify database state after operations
- Test edge cases and boundary conditions

### Controller Tests
- Mock service dependencies
- Test HTTP status codes
- Verify response types
- Test authorization scenarios

### Worker Tests
- Test background job processing
- Verify error handling
- Test file operations (CSV imports)
- Mock external dependencies (email, Graph API)

## Dependencies

- **xUnit** - Test framework
- **Moq** - Mocking framework
- **FluentAssertions** - Assertion library
- **Microsoft.EntityFrameworkCore.InMemory** - In-memory database for testing
- **Microsoft.AspNetCore.Mvc.Testing** - Controller testing utilities

## Notes

- All tests use in-memory databases for fast execution and isolation
- Tests are designed to be independent and can run in any order
- Test data is created fresh for each test to avoid side effects
- File-based tests (CSV imports) use temporary directories that are cleaned up

