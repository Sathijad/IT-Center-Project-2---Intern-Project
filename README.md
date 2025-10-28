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

