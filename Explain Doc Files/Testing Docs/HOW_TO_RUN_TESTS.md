# How to Run All Tests - Complete Guide

## Prerequisites

Before running tests, ensure you have:
- Java 21 installed
- Node.js 18+ installed
- Flutter installed
- Docker installed (for ZAP scans)
- Maven wrapper (in auth-backend)
- Newman installed globally: `npm install -g newman`

---

## 1. Backend Tests (Spring Boot)

### Step 1: Set JAVA_HOME
```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
```

### Step 2: Navigate to backend
```powershell
cd auth-backend
```

### Step 3: Run tests
```powershell
./mvnw test -Dspring.profiles.active=test
```

### Step 4: Run with coverage
```powershell
./mvnw test jacoco:report jacoco:check -Dspring.profiles.active=test
```

### Step 5: View results
```powershell
# View test results in console
# View coverage report at: target/site/jacoco/index.html
```

**Expected Output:**
```
Tests run: 31, Failures: 0, Errors: 0, Skipped: 0
Coverage: 80% or higher
```

---

## 2. Frontend Tests (React + Vitest)

### Step 1: Navigate to frontend
```powershell
cd admin-web
```

### Step 2: Install dependencies (if not done)
```powershell
npm install
```

### Step 3: Run tests
```powershell
npm test -- --run
```

### Step 4: Run with coverage
```powershell
npm test -- --run --coverage
```

### Step 5: View results
```powershell
# Test results in console
# Coverage report in: coverage/
```

**Expected Output:**
```
✓ Login Component (2)
  ✓ renders without crashing
  ✓ displays sign in button
✓ ProtectedRoute Component (4)
✓ ProfileForm Integration (2)
✓ Login Accessibility Tests (2)

Test Files  5 passed (5)
Tests  10 passed (10)
```

---

## 3. Mobile Tests (Flutter)

### Step 1: Navigate to mobile app
```powershell
cd mobile-app
```

### Step 2: Get dependencies
```powershell
flutter pub get
```

### Step 3: Run all tests
```powershell
flutter test
```

### Step 4: Run with coverage
```powershell
flutter test --coverage
```

### Step 5: View results
```powershell
# Results in console
# Coverage report in: coverage/
```

**Expected Output:**
```
00:00 +6: All tests passed!
```

---

## 4. Security Testing (ZAP)

### Step 1: Start backend (if not running)
```powershell
cd auth-backend
./mvnw spring-boot:run
```

### Step 2: In a new terminal, scan backend
```powershell
docker run --rm -t owasp/zap2docker-stable zap-baseline.py `
  -t http://host.docker.internal:8080 `
  -r zap-report-backend.html -d
```

### Step 3: Scan frontend (start it first on port 5173)
```powershell
docker run --rm -t owasp/zap2docker-stable zap-baseline.py `
  -t http://host.docker.internal:5173 `
  -r zap-report-admin.html -d
```

### Step 4: View reports
```powershell
# Open HTML reports in browser
```

**Expected Output:**
```
No High or Critical vulnerabilities found
```

---

## 5. Postman/Newman API Tests

### Step 1: Get access tokens
```powershell
# Login to get tokens via Cognito or use existing tokens
# Update itcenter-auth.postman_environment.json with tokens
```

### Step 2: Start backend (must be running)
```powershell
cd auth-backend
./mvnw spring-boot:run
```

### Step 3: Run Newman tests
```powershell
cd ..
cd tests/postman

newman run itcenter-auth.postman_collection.json `
  -e itcenter-auth.postman_environment.json `
  --reporters cli,junit `
  --reporter-junit-export newman-results.xml
```

### Step 4: View results
```powershell
# Results in console
# XML report in: newman-results.xml
```

**Expected Output:**
```
Health Check
  ✓ Status code is 200
  ✓ Response has status UP

Me - With Auth (200)
  ✓ Status code is 200
  ✓ Response has user data

Iterations: 7 total, 7 passed, 0 failed
```

---

## 6. Run All Tests at Once (Quick Script)

Create a file `run-all-tests.ps1`:

```powershell
# Run All Tests Script
Write-Host "=== Running Backend Tests ===" -ForegroundColor Green
cd auth-backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
./mvnw test -Dspring.profiles.active=test
cd ..

Write-Host "`n=== Running Frontend Tests ===" -ForegroundColor Green
cd admin-web
npm test -- --run
cd ..

Write-Host "`n=== Running Mobile Tests ===" -ForegroundColor Green
cd mobile-app
flutter test
cd ..

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Yellow
```

Run it:
```powershell
.\run-all-tests.ps1
```

---

## 7. Individual Test Commands

### Run specific backend test
```powershell
cd auth-backend
./mvnw test -Dtest=AuditServiceTest -Dspring.profiles.active=test
```

### Run specific frontend test
```powershell
cd admin-web
npm test -- --run ProtectedRoute
```

### Run specific mobile test
```powershell
cd mobile-app
flutter test profile_widget_test.dart
```

---

## 8. View Coverage Reports

### Backend Coverage
```powershell
cd auth-backend
# Open in browser:
target/site/jacoco/index.html
```

### Frontend Coverage
```powershell
cd admin-web
# Open in browser:
coverage/index.html
```

### Mobile Coverage
```powershell
cd mobile-app
# See in console or coverage/
```

---

## 9. Troubleshooting

### Backend: JAVA_HOME not set
```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
```

### Backend: Port 8080 already in use
```powershell
# Kill existing process or change port in application.yml
```

### Frontend: Port 5173 already in use
```powershell
# Kill existing process or change port in vite.config.ts
```

### Mobile: Flutter not found
```powershell
# Add Flutter to PATH or use full path
```

### Newman: Command not found
```powershell
npm install -g newman
```

### ZAP: Docker not running
```powershell
# Start Docker Desktop first
```

---

## 10. Expected Results Summary

After running all tests, you should have:

| Component | Tests | Expected Result |
|-----------|-------|----------------|
| Backend | 31 | All passing, 80%+ coverage |
| Frontend | 10 | All passing |
| Mobile | 6 | All passing |
| Postman | 7 | All passing |
| ZAP Backend | 1 scan | No High/Critical issues |
| ZAP Frontend | 1 scan | No High/Critical issues |

**Total Tests: 54**
**Expected Status: All Passing ✅**

---

## Quick Reference

```powershell
# Backend
cd auth-backend; ./mvnw test

# Frontend  
cd admin-web; npm test

# Mobile
cd mobile-app; flutter test

# Postman
newman run tests/postman/itcenter-auth.postman_collection.json

# ZAP
docker run --rm -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080 -r report.html
```

