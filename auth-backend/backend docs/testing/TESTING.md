# Backend Testing Guide

Complete testing setup for the IT Center Auth Backend API.

## 📋 Overview

This project uses:
- **JUnit 5** for unit and integration tests
- **Mockito** for mocking dependencies
- **AssertJ** for fluent assertions
- **MockMvc** for integration tests
- **JaCoCo** for code coverage (80% minimum)
- **H2 in-memory database** for fast tests
- **Testcontainers** (optional) for PostgreSQL integration tests

## 🏗️ Test Structure

```
src/test/
├── java/
│   ├── com/itcenter/auth/
│   │   ├── TestJwt.java                    # JWT test utilities
│   │   ├── TestDataBuilder.java            # Test data builders
│   │   └── AbstractContainerBaseTest.java  # Testcontainers base class
│   ├── unit/                                # Unit tests (Mockito)
│   │   ├── UserServiceTest.java
│   │   ├── UserServiceUpdateProfileTest.java
│   │   └── UserServiceUpdateRolesTest.java
│   ├── it/                                  # Integration tests (MockMvc)
│   │   ├── ApiEndpointIntegrationTest.java
│   │   ├── MeApiIT.java
│   │   ├── UserControllerIT.java
│   │   └── RolePatchIT.java
│   └── repository/                          # Repository tests (@DataJpaTest)
│       ├── AppUserRepositoryTest.java
│       └── RoleRepositoryTest.java
└── resources/
    └── application-test.yml                 # Test configuration
```

## 🚀 Running Tests

### Run All Tests

```bash
cd auth-backend
mvn clean test
```

### Run Only Unit Tests

```bash
mvn clean test -Dtest="*Test"
```

### Run Only Integration Tests

```bash
mvn clean test -Dtest="*IT"
```

### Run with JaCoCo Coverage Report

```bash
mvn clean verify
# Coverage report: target/site/jacoco/index.html
```

### Run Tests in Specific Profile

```bash
# Unit tests only
mvn clean test -Ptest

# Integration tests only
mvn clean verify -Pintegration

# All tests
mvn clean verify -Pall-tests
```

## 🧪 Test Categories

### 1. Unit Tests (Mockito)

**Location:** `src/test/java/unit/`

**Tests:**
- `UserServiceTest` - Basic CRUD operations
- `UserServiceUpdateProfileTest` - Profile update logic
- `UserServiceUpdateRolesTest` - Role management edge cases

**Key Scenarios:**
- ✅ Get current user profile
- ✅ Update profile (displayName, locale)
- ✅ Add/remove user roles
- ✅ Handle non-existent role
- ✅ Handle duplicate role
- ✅ Handle empty role list
- ✅ Case-insensitive role names
- ✅ Trim whitespace from inputs

**Example:**

```java
@Test
void updateUserRoles_NonexistentRole_ThrowsException() {
    when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
    when(roleRepository.findByName("INVALID_ROLE")).thenReturn(Optional.empty());
    
    UpdateRolesRequest request = new UpdateRolesRequest();
    request.setRoles(List.of("INVALID_ROLE"));
    
    assertThatThrownBy(() -> userService.updateUserRoles(1L, request))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("Role not found");
}
```

### 2. Integration Tests (MockMvc)

**Location:** `src/test/java/it/`

**Coverage:**
- GET /api/v1/me
- PATCH /api/v1/me
- GET /api/v1/admin/users
- PATCH /api/v1/admin/users/{id}/roles
- GET /healthz

**Security Tests:**
- ✅ 401 without JWT
- ✅ 403 with wrong role
- ✅ 200 with valid JWT and correct role

**Example:**

```java
@Test
void testGetMe_WithValidJWT_Returns200() throws Exception {
    mockMvc.perform(get("/api/v1/me")
                    .with(SecurityMockMvcRequestPostProcessors.jwt()
                            .jwt(j -> j.claim("sub", testUser.getCognitoSub())
                                    .claim("email", testUser.getEmail()))
                            .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email", is(testUser.getEmail())));
}
```

### 3. Repository Tests (@DataJpaTest)

**Location:** `src/test/java/repository/`

**Tests:**
- `AppUserRepositoryTest` - User repository queries
- `RoleRepositoryTest` - Role repository queries

**Scenarios:**
- ✅ CRUD operations
- ✅ Custom query methods (findByEmail, searchUsers)
- ✅ Many-to-many relationship handling
- ✅ Case-insensitive searches
- ✅ Active user filtering

## 📊 Code Coverage

### Requirements

- **Minimum 80%** instruction and branch coverage
- Build fails if below threshold
- Excludes DTOs, entities, and configuration classes

### View Coverage Report

```bash
mvn clean verify
open target/site/jacoco/index.html  # macOS/Linux
start target/site/jacoco/index.html  # Windows
```

### Coverage Breakdown

```
Service Layer:    ~90% (UserService, AuditService)
Repository Layer: ~85% (UserRepository, RoleRepository)
Controller Layer: ~95% (UserController, HealthController)
Configuration:    N/A (excluded)
```

## 🔧 Configuration

### Test Profile (`application-test.yml`)

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:itcenter_test
    driver-class-name: org.h2.Driver
  
  jpa:
    hibernate:
      ddl-auto: create-drop
  
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:9000/auth/realms/test

server:
  port: 0  # Random port for tests
```

### Maven Profiles

```xml
<profile>
  <id>test</id>          <!-- Unit tests only -->
</profile>

<profile>
  <id>integration</id>   <!-- Integration tests only -->
</profile>

<profile>
  <id>all-tests</id>      <!-- All tests -->
</profile>
```

## 🎯 Test Data

### Using TestDataBuilder

```java
// Create test user
AppUser user = TestDataBuilder.createTestUser("user@example.com");

// Create admin user
AppUser admin = TestDataBuilder.createAdminUser("admin@example.com");

// Create user with roles
AppUser user = TestDataBuilder.createUserWithMultipleRoles(
    "user@example.com", "EMPLOYEE", "MANAGER"
);
```

### Seed Data

Test data is automatically created in `@BeforeEach` methods:
- Roles: ADMIN, EMPLOYEE, MANAGER
- Users: admin user, test user, employee user
- All with unique emails and Cognito subs

## 🐛 Debugging Tests

### Run Single Test

```bash
mvn test -Dtest=UserServiceUpdateProfileTest
```

### Run Single Method

```bash
mvn test -Dtest=UserServiceUpdateProfileTest#updateProfile_UpdatesDisplayName
```

### Debug Mode

```bash
mvn test -Dmaven.surefire.debug
# Then attach debugger to port 5005
```

### Verbose Output

```bash
mvn test -X
```

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
      - run: mvn clean verify
      - uses: codecov/codecov-action@v3
        with:
          file: ./target/site/jacoco/jacoco.xml
```

## 🚨 Common Issues

### Issue: Tests Fail with "JWT Decoder Not Found"

**Solution:** Add `@ActiveProfiles("test")` to test class

### Issue: Database Schema Errors

**Solution:** Ensure H2 dependencies are in pom.xml

### Issue: Coverage Below 80%

**Solution:** Add more edge case tests or exclude unnecessary classes

## 📚 References

- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [Spring Boot Testing](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing)
- [JaCoCo Maven Plugin](https://www.jacoco.org/jacoco/trunk/doc/maven.html)

## ✨ Best Practices

1. **Arrange-Act-Assert** pattern for clear test structure
2. **Descriptive test names** that explain what is being tested
3. **One assertion per test** when possible
4. **Use builders** for complex test data
5. **Clean up** test data in `@AfterEach`
6. **Mock external dependencies** in unit tests
7. **Use real dependencies** in integration tests
8. **Test edge cases** (null, empty, invalid input)
9. **Test error scenarios** (404, 403, 500)
10. **Keep tests fast** (< 1 second per test)
