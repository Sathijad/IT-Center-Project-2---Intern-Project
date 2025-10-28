# How Testing Works in Backend Development

## Overview

When writing backend code, we follow **Test-Driven Development (TDD)** or **Test-After Development** principles where tests are written alongside the code to ensure quality and catch bugs early.

---

## 🔍 Testing Strategy

We use **3 main types of tests** in this project:

### 1. **Unit Tests** (Isolated Testing)
- **Purpose**: Test individual components in isolation
- **Framework**: JUnit 5 + Mockito
- **Where**: `src/test/java/com/itcenter/auth/unit/`
- **Example**: Testing `UserService` without hitting the database

### 2. **Integration Tests** (Component Testing)
- **Purpose**: Test multiple components working together
- **Framework**: Spring Boot Test + MockMvc
- **Where**: `src/test/java/com/itcenter/auth/it/`
- **Example**: Testing REST endpoints with database interactions

### 3. **Repository Tests** (Database Testing)
- **Purpose**: Test database operations
- **Framework**: Spring Data JPA Test
- **Where**: `src/test/java/com/itcenter/auth/repository/`
- **Example**: Testing database queries and operations

---

## 📚 How It Works - Step by Step

### Example Scenario: Adding a New Feature

Let's say we want to add a new endpoint: **"Get User Profile"**

#### Step 1: Write the Test First (TDD Approach)

```java
@Test
void getUserProfile_ReturnsUserData() throws Exception {
    mockMvc.perform(get("/api/v1/me")
            .with(SecurityMockMvcRequestPostProcessors.jwt()
                    .jwt(j -> j.claim("sub", "user-123")
                            .claim("email", "user@test.com"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email", is("user@test.com")));
}
```

**Why first?** This fails initially (no implementation), proving the test works.

#### Step 2: Implement the Code

```java
@GetMapping("/me")
public ResponseEntity<UserDto> getProfile(JwtAuthenticationToken token) {
    // Implementation here
    UserDto user = userService.getCurrentUser(token);
    return ResponseEntity.ok(user);
}
```

#### Step 3: Run the Test

```bash
./mvnw test
```

#### Step 4: Iterate Until Green ✅

If test fails, fix the code and run again until passing.

---

## 🛠️ Testing Tools Used

### 1. **JUnit 5** (Test Framework)
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

**Purpose**: Provides test annotations and assertions
```java
@Test
@BeforeEach
@AfterEach
```

### 2. **Mockito** (Mocking Framework)
```java
@Mock
private UserRepository userRepository;

@InjectMocks
private UserService userService;

// Mock behavior
when(userRepository.findById(1L)).thenReturn(Optional.of(user));

// Verify interactions
verify(userRepository, times(1)).save(user);
```

**Purpose**: Create fake dependencies for isolated testing

### 3. **Spring Security Test** (Security Testing)
```java
.with(SecurityMockMvcRequestPostProcessors.jwt()
    .jwt(j -> j.claim("sub", "user-123")
            .claim("email", "user@test.com"))
    .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
```

**Purpose**: Simulate authenticated requests with JWT tokens

### 4. **Rest Assured** (API Testing)
```xml
<dependency>
    <groupId>io.rest-assured</groupId>
    <artifactId>rest-assured</artifactId>
    <version>5.4.0</version>
</dependency>
```

**Purpose**: Test REST endpoints with fluent API

### 5. **H2 Database** (In-Memory Database)
```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
```

**Purpose**: Fast database for tests, no real database needed

### 6. **JaCoCo** (Code Coverage)
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
</plugin>
```

**Purpose**: Measure how much code is tested (minimum 80%)

---

## 📁 Real Examples from This Project

### Example 1: Unit Test (`AuditServiceTest.java`)

```java
@ExtendWith(MockitoExtension.class)
class AuditServiceTest {
    
    @Mock
    private LoginAuditRepository auditRepository; // Fake repository
    
    @Mock
    private AppUserRepository userRepository; // Fake repository
    
    @InjectMocks
    private AuditService auditService; // Real service with fake dependencies
    
    @Test
    void logEvent_WithUserId_SavesSuccessfully() {
        // Given - Setup test data
        Long userId = 1L;
        when(userRepository.findById(userId))
            .thenReturn(Optional.of(testUser));
        
        // When - Execute the method
        auditService.logEvent(userId, "LOGIN_SUCCESS", 
            "127.0.0.1", "TestAgent", null);
        
        // Then - Verify it worked
        verify(auditRepository, times(1)).save(any(LoginAudit.class));
    }
}
```

**What's happening?**
1. We mock (fake) the repositories
2. We test the service in isolation
3. We verify it saves to the audit repository

### Example 2: Integration Test (`UserControllerIT.java`)

```java
@SpringBootTest  // Starts full Spring context
@AutoConfigureMockMvc  // Enables MockMvc for HTTP testing
@ActiveProfiles("test") // Uses test database
class UserControllerIT {
    
    @Autowired
    private MockMvc mockMvc; // For making HTTP requests
    
    @Autowired
    private AppUserRepository userRepository; // Real repository
    
    @Test
    void me_ReturnsUserProfile() throws Exception {
        // Given - Create user in database
        AppUser testUser = createTestUser();
        
        // When - Make HTTP request
        mockMvc.perform(get("/api/v1/me")
                .with(SecurityMockMvcRequestPostProcessors.jwt()
                        .jwt(j -> j.claim("sub", testUser.getCognitoSub())
                                .claim("email", testUser.getEmail()))
                        .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
        
        // Then - Verify response
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is(testUser.getEmail())));
    }
}
```

**What's happening?**
1. Full Spring Boot application starts
2. Real in-memory database is used
3. HTTP request is made to the endpoint
4. Response is verified

---

## 🔄 The Development Cycle

### When Writing Backend Code:

```
1. Write Test First (RED) ❌
   ↓
2. Implement Code (GREEN) ✅
   ↓
3. Refactor Code (BLUE) 🔵
   ↓
4. Run Tests Again
   ↓
5. Repeat for each feature
```

### Example: Adding a New Endpoint

#### Step 1: RED - Write failing test
```java
@Test
void deleteUser_RemovesUser() {
    // This will fail because method doesn't exist
    userService.deleteUser(1L);
}
```

#### Step 2: GREEN - Make it pass
```java
public void deleteUser(Long userId) {
    userRepository.deleteById(userId);
}
```

#### Step 3: BLUE - Refactor
```java
public void deleteUser(Long userId) {
    if (!userRepository.existsById(userId)) {
        throw new UserNotFoundException();
    }
    userRepository.deleteById(userId);
    auditService.logEvent(testUser, "USER_DELETED", 
        getClientIp(), getUserAgent(), null);
}
```

#### Step 4: Run tests to ensure everything works

---

## 🎯 What Gets Tested?

### ✅ Services (Business Logic)
- UserService
- AuditService
- UserProvisioningService

**Why?** Core business logic must work correctly

### ✅ Controllers (API Endpoints)
- HealthController
- UserController
- AuditController

**Why?** API contracts must be correct for frontend

### ✅ Security Rules
- Authentication required
- Role-based access control

**Why?** Prevent unauthorized access

### ✅ Database Operations
- UserRepository
- RoleRepository

**Why?** Ensure data is saved/retrieved correctly

---

## 📊 Test Configuration

### Test Database (H2 In-Memory)

```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb  # In-memory database
    driverClassName: org.h2.Driver
  h2:
    console:
      enabled: true
  jpa:
    hibernate:
      ddl-auto: create-drop  # Create schema for each test
```

**Benefits:**
- Fast execution (no disk I/O)
- Isolated tests (fresh database each time)
- No cleanup needed
- Works without external database

### Maven Test Configuration

```xml
<plugin>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.1.2</version>
</plugin>
```

**This runs:**
- All tests in `**/*Test.java` (unit tests)
- In `src/test/java` directory
- Automatically during `mvn test`

### Failsafe Plugin (Integration Tests)

```xml
<plugin>
    <artifactId>maven-failsafe-plugin</artifactId>
    <configuration>
        <includes>
            <include>**/*IT.java</include>  # Integration tests
        </includes>
    </configuration>
</plugin>
```

**This runs:**
- All tests in `**/*IT.java` (integration tests)
- After unit tests
- During `mvn verify`

### Code Coverage (JaCoCo)

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <configuration>
        <rules>
            <rule>
                <element>BUNDLE</element>
                <limits>
                    <limit>
                        <counter>LINE</counter>
                        <minimum>0.80</minimum>  # 80% minimum
                    </limit>
                </limits>
            </rule>
        </rules>
    </configuration>
</plugin>
```

**What it does:**
- Measures how much code is tested
- Requires 80% line coverage
- Fails build if below threshold
- Generates HTML report

---

## 🚀 Running Tests

### All Tests
```bash
cd auth-backend
./mvnw test
```

**Output:**
```
Tests run: 18, Failures: 0, Errors: 0, Skipped: 0
```

### Specific Test
```bash
./mvnw test -Dtest=UserServiceTest
```

### With Coverage
```bash
./mvnw test jacoco:report
```

**View coverage:**
```
Open in browser: target/site/jacoco/index.html
```

### Integration Tests Only
```bash
./mvnw test -Dtest="**/*IT"
```

### Unit Tests Only
```bash
./mvnw test -Dtest="**/*Test"
```

---

## 💡 Key Principles

### 1. **Test Independence**
Each test should be independent and can run in any order.

### 2. **Arrange-Act-Assert (AAA)**
```java
@Test
void example() {
    // Arrange - Setup test data
    User user = new User("test@email.com");
    
    // Act - Execute the code
    userService.save(user);
    
    // Assert - Verify the result
    assertEquals(1, userRepository.count());
}
```

### 3. **One Assertion Per Test**
Test one thing at a time for clarity.

### 4. **Use Descriptive Names**
```java
@Test
void getProfile_WithValidUser_ReturnsUserData()  // Good ✅

@Test
void test1()  // Bad ❌
```

### 5. **Fast Tests**
- Unit tests: milliseconds
- Integration tests: seconds
- Keep tests fast for quick feedback

---

## 🎓 Best Practices

### ✅ DO:
- Write tests before or alongside code
- Test happy paths and error cases
- Use meaningful test data
- Clean up after tests
- Test at the right level (unit vs integration)
- Keep tests simple and readable

### ❌ DON'T:
- Skip tests when refactoring
- Test implementation details
- Share state between tests
- Make tests depend on external services
- Write tests that are as complex as the code
- Forget edge cases

---

## 📈 Current Test Coverage

```
Component          Tests    Status
────────────────────────────────────
AuditService      3        ✅
UserService       4        ✅
UserController    3        ✅
SecurityRules     4        ✅
AuditController   3        ✅
HealthController  2        ✅
────────────────────────────────────
TOTAL             18       ✅
```

**Coverage Requirements:**
- Minimum: 80% line coverage
- Minimum: 70% branch coverage
- All tests must pass
- No skipped tests

---

## 🎯 Summary

**How testing works:**

1. **Write test** → Defines expected behavior
2. **Write code** → Implements the feature
3. **Run test** → Verifies it works
4. **Refactor** → Improves code quality
5. **Repeat** → Continue for next feature

**Benefits:**
- ✅ Catches bugs early
- ✅ Documents expected behavior
- ✅ Enables safe refactoring
- ✅ Increases confidence
- ✅ Prevents regressions

**Testing is not optional** - it's part of the development process that ensures quality code. Every backend feature should have corresponding tests.

---

## 📚 Additional Resources

- [JUnit 5 Documentation](https://junit.org/junit5/)
- [Mockito Documentation](https://site.mockito.org/)
- [Spring Boot Testing](https://docs.spring.io/spring-boot/docs/current/reference/html/testing.html)
- [Test-Driven Development by Kent Beck](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)

