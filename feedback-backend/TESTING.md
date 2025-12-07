# Phase 7 Unit Testing Documentation

## Overview

This document describes the unit testing implementation for Phase 7 (Feedback & Issue Reporting API). The tests are written using PHPUnit 11 and cover all major components of the feedback backend.

## Test Structure

```
tests/
├── Feature/              # Integration/Feature tests
│   └── Controllers/     # Controller integration tests
├── Unit/                 # Unit tests
│   ├── Http/            # Request validation tests
│   ├── Jobs/            # Job tests
│   ├── Middleware/      # Middleware tests
│   ├── Models/          # Model tests
│   └── Services/        # Service tests
├── TestCase.php         # Base test case
└── CreatesApplication.php
```

## Running Tests

### Run All Tests
```bash
php vendor/bin/phpunit
```

### Run Specific Test Suite
```bash
# Unit tests only
php vendor/bin/phpunit tests/Unit

# Feature tests only
php vendor/bin/phpunit tests/Feature
```

### Run Specific Test File
```bash
php vendor/bin/phpunit tests/Unit/Models/FeedbackTest.php
```

### Run with Coverage
```bash
php vendor/bin/phpunit --coverage-html coverage
```

## Test Coverage

### Models (Unit Tests)
- ✅ `Feedback` - Model structure, relationships, label handling
- ✅ `FeedbackMessage` - Model structure and relationships
- ✅ `FeedbackAttachment` - Model structure and relationships

### Services (Unit Tests)
- ✅ `FeedbackService` - CRUD operations, filtering, permissions, CSV export
- ✅ `S3Service` - S3 key generation, configuration validation
- ✅ `ComprehendService` - Sentiment analysis, PII detection, mock mode

### Controllers (Feature Tests)
- ✅ `HealthController` - Health check endpoint
- ✅ `FeedbackController` - Create, list, show, update, add message
- ✅ `ExportController` - CSV export functionality
- ✅ `IntegrationController` - Sentiment analysis and Teams notifications

### Middleware (Unit Tests)
- ✅ `RoleMiddleware` - Role-based access control, case-insensitive roles

### Jobs (Unit Tests)
- ✅ `AnalyzeSentimentJob` - Sentiment analysis processing, error handling

### Request Validation (Unit Tests)
- ✅ `CreateFeedbackRequest` - Validation rules, required fields, enums
- ✅ `UpdateFeedbackRequest` - Validation rules
- ✅ `AddMessageRequest` - Validation rules

## Test Configuration

The test configuration is defined in `phpunit.xml`:
- Uses SQLite in-memory database for testing
- Sets up test environment variables
- Configures test suites (Unit and Feature)

## Key Testing Patterns

### Database Setup
Tests use `RefreshDatabase` trait and create tables dynamically using raw SQL to avoid migration dependencies.

### Mocking
- AWS services (S3, Comprehend) are mocked or use mock mode
- JWT authentication middleware is bypassed in feature tests
- Services are mocked using Mockery for isolated unit tests

### Factories
Model factories are available for:
- `FeedbackFactory` - Creates feedback test data
- `FeedbackMessageFactory` - Creates message test data

## Test Data

Tests create minimal test data using:
- Direct database inserts for simplicity
- Factories for complex scenarios
- UUIDs for primary keys

## Known Limitations

1. **S3Service Tests**: Some S3Client methods require complex mocking and are skipped
2. **Database Migrations**: Tests create tables directly rather than using migrations
3. **Authentication**: JWT middleware is bypassed in feature tests using `withoutMiddleware()`

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Cleanup**: Tests use `RefreshDatabase` to ensure clean state
3. **Assertions**: Tests use specific assertions to verify expected behavior
4. **Naming**: Test methods use descriptive names following `test_` prefix convention

## Continuous Integration

Tests should be run:
- Before committing code
- In CI/CD pipeline
- Before deploying to production

## Future Improvements

- [ ] Add more edge case tests
- [ ] Increase code coverage to 80%+
- [ ] Add performance tests
- [ ] Add integration tests with real AWS services (optional)
- [ ] Add API contract tests


