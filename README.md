# IT Center Auth Project - Phase 1

Secure, role-based staff authentication system with AWS Cognito OIDC integration.

## 🏗️ Project Structure

```
/auth-backend   # Spring Boot (Java 21)
/admin-web      # React (Vite + Tailwind)
/mobile-app     # Flutter
/infra          # Docker Compose, PostgreSQL, MailHog
/docs           # OpenAPI, ERD, documentation
```

## 🚀 Quick Start

### Prerequisites

- Java 21 (set JAVA_HOME before building)
- Flutter 3.35.6 / Dart 3.9.2
- Docker & Docker Compose
- Node.js 18+

### Environment Setup

**Important: Use Java 21 explicitly**

```powershell
# Set Java 21 before any backend operations
# First, verify Java 21 is installed
where.exe java

# Then set JAVA_HOME (use single quotes to avoid escaping issues)
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'

# Verify JAVA_HOME is set correctly
Test-Path "$env:JAVA_HOME\bin\java.exe"  # Should return True

# Now you can run Maven commands
.\mvnw.cmd spring-boot:run
```

### Start Infrastructure

```powershell
docker compose -f infra/docker-compose.yml up -d
```

### Backend

**Option 1: Using the start script (easiest)**
```powershell
cd auth-backend
.\start.bat
```

**Option 2: Using PowerShell script**
```powershell
cd auth-backend
.\start.ps1
```

**Option 3: Using Maven wrapper directly**
```powershell
cd auth-backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
.\mvnw.cmd spring-boot:run
```

Backend runs on `http://localhost:8080`

### Admin Web

```powershell
cd admin-web
npm install
npm run dev
```

Admin portal runs on `http://localhost:5173`

### Mobile App

```powershell
cd mobile-app
flutter pub get
flutter run
```

## 🔐 AWS Cognito Configuration

```
COGNITO_USER_POOL_ID: ap-southeast-2_hTAYJId8y
COGNITO_CLIENT_ID: 3rdnl5ind8guti89jrbob85r4i
COGNITO_DOMAIN: itcenter-auth.auth.ap-southeast-2.amazoncognito.com
AWS_REGION: ap-southeast-2
```

## 📋 Features

- ✅ AWS Cognito OIDC integration (Web + Mobile)
- ✅ JWT validation with Spring Security
- ✅ Role-based access control (ADMIN, EMPLOYEE)
- ✅ Audit logging for all auth events
- ✅ PostgreSQL with Flyway migrations
- ✅ React Admin portal
- ✅ Flutter mobile app
- ✅ Docker Compose local dev stack

## ⚠️ Important: AWS Cognito Configuration

Before running the frontend, you **must** configure the redirect URIs in AWS Cognito:

**See `COGNITO_SETUP.md` for detailed instructions.**

Quick setup:
1. Go to AWS Console → Cognito → User Pool `ap-southeast-2_hTAYJId8y`
2. Add callback URL: `http://localhost:5173/auth/callback`
3. Add sign-out URL: `http://localhost:5173`

## 🧪 Testing

### Backend Testing (Comprehensive)

See **[TESTING.md](./auth-backend/TESTING.md)** for complete testing guide.

```powershell
# Run all tests with coverage
cd auth-backend
mvn clean verify

# View coverage report
start target/site/jacoco/index.html

# Run only unit tests
mvn clean test

# Run only integration tests  
mvn clean verify -Dtest="*IT"
```

**Test Coverage:**
- ✅ Unit tests (Mockito) - Service layer, 80%+ coverage
- ✅ Integration tests (MockMvc) - API endpoints, security
- ✅ Repository tests (@DataJpaTest) - Database queries
- ✅ Edge cases - Non-existent roles, duplicate roles, invalid input

**Coverage Requirements:**
- Minimum 80% instruction and branch coverage
- Build fails if below threshold
- Excludes DTOs and configuration classes

### Frontend Tests

```powershell
cd admin-web
npm test
```

### Mobile Tests

```powershell
cd mobile-app
flutter test
```

### UI Automation Tests (Selenium)

Selenium WebDriver tests for the React admin portal with Page Object Model pattern.

**Setup:**
```powershell
cd admin-web
npm install
```

**Run UI Tests:**
```powershell
# Run in headless mode (default)
npm run ui:test

# Run with visible browser
$env:HEADFUL="true"; npm run ui:test

# Set custom base URL
$env:WEB_BASE_URL="http://localhost:5173"; npm run ui:test
```

**Test Suite:**
- `login.spec.ts` - Login flow with pre-seeded token for CI
- `users.roles.spec.ts` - Role management (idempotent role edits)
- `audit.spec.ts` - Audit log viewing and filtering
- `a11y.smoke.spec.ts` - Accessibility checks with axe-core

**Page Objects:**
- `LoginPage` - Sign in with Cognito flow
- `DashboardPage` - User avatar/email verification
- `UsersPage` - User management and role toggling
- `AuditPage` - Event filtering and verification

**Features:**
- Headless Chrome by default (configurable via `HEADFUL=true`)
- Page Object Model for maintainability
- Idempotent tests (safe to run repeatedly)
- Accessibility testing with axe-core
- Pre-seeded auth tokens for CI/CD bypass

## 📖 API Documentation

OpenAPI spec: `/docs/openapi/auth.yaml`

## 🔒 Security

- JWT tokens with PKCE flow
- Server-side RBAC enforcement
- Audit logging for compliance
- CORS configured
- Security headers enabled
- OWASP ZAP baseline scans

## 🎯 Roles

- **ADMIN**: Full access (user management, audit logs, role assignment)
- **EMPLOYEE**: View/edit own profile only

## 📝 License

IT Center Internal Project

