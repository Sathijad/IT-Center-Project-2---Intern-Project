# Testing Guide

This document provides testing information for the IT Center Auth module.

## Test Structure

```
auth-backend/
  src/test/
    java/com/itcenter/auth/
      unit/          # Unit tests (mocked dependencies)
        - AuditServiceTest.java
        - UserProvisioningServiceTest.java
        - UserServiceTest.java
      it/            # Integration tests (real database + components)
        - HealthControllerIT.java
        - SecurityRulesIT.java
        - UserControllerIT.java
        - AuditControllerIT.java
        - MeApiIT.java
        - AdminUsersApiIT.java
      repository/
        - AppUserRepositoryTest.java
    resources/
      application-test.yml  # Test configuration
```

## Running Tests

### Backend Tests

```bash
cd auth-backend
./mvnw test -Dspring.profiles.active=test
```

**Expected Output:**
```
[INFO] Tests run: 18, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] Results:
[INFO]   Tests run: 18
[INFO]   Failures: 0
[INFO]   Errors: 0
[INFO]   Skipped: 0
```

Run specific test class:
```bash
./mvnw test -Dtest=AuditServiceTest
```

### Test Coverage

JaCoCo code coverage reports are generated automatically with 80% minimum requirement:
```bash
./mvnw test jacoco:report jacoco:check
```

**Expected Coverage:**
- Line coverage: ≥80%
- Branch coverage: ≥70%

View report: `target/site/jacoco/index.html`

Coverage reports are automatically uploaded as CI artifacts.

## Test Types

### Unit Tests (`unit/` package)
- Test individual classes in isolation
- Use mocks for dependencies
- Fast execution
- Examples: `AuditServiceTest`, `UserProvisioningServiceTest`

### Integration Tests (`it/` package)
- Test multiple components together
- Use real database (H2 in-memory)
- Test REST endpoints with MockMvc
- Examples: `SecurityRulesIT`, `HealthControllerIT`

## Test Database

Tests use H2 in-memory database (configured in `application-test.yml`):
- Fast execution
- Isolated tests
- No external dependencies

## What's Being Tested

### ✅ Implemented
- [x] AuditService unit tests
- [x] UserProvisioningService unit tests  
- [x] Health endpoint integration test
- [x] Security rules integration test
- [x] UserController integration test

### 📝 TODO
- [ ] Add more UserService unit tests
- [ ] Add AuditService integration tests
- [ ] Add Repository tests
- [ ] Add REST Assured API tests
- [ ] Add performance tests

## Running Specific Tests

```bash
# All unit tests
./mvnw test -Dtest="com.itcenter.auth.unit.*"

# All integration tests  
./mvnw test -Dtest="com.itcenter.auth.it.*"

# Single test
./mvnw test -Dtest=AuditServiceTest#logEvent_WithUserId_SavesSuccessfully
```

## Test Configuration

See `src/test/resources/application-test.yml`:
- H2 in-memory database
- Logging levels adjusted for tests
- Flyway disabled (JPA handles schema)

## Dependencies

Already configured in `pom.xml`:
- JUnit 5
- Mockito
- AssertJ
- Spring Boot Test
- Spring Security Test
- REST Assured
- H2 Database
- JaCoCo (code coverage)

