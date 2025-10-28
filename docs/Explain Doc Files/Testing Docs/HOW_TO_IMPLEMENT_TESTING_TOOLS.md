# How to Implement Testing Tools for IT Center Project

## 🎯 Quick Decision Matrix

| What You Want to Test | Tool to Use | Why |
|----------------------|-------------|-----|
| Backend business logic | **JUnit 5** ✅ | Already using, perfect fit |
| Backend API endpoints | **Rest Assured** ✅ | Already using, excellent for REST |
| React components | **Vitest + React Testing Library** ✅ | Already using, fast and modern |
| Accessibility of web UI | **Axe** ✅ | Already using, automated a11y testing |
| Full user workflows (web) | **Playwright** ➕ Add this | Better than Selenium for React |
| Mobile app functionality | **Flutter Test** ✅ | Already built-in, no extra setup |
| Security vulnerabilities | **OWASP ZAP** ➕ Add this | Automated security scanning |
| API manual testing | **Postman** ✅ | Keep for debugging and docs |
| Network packet analysis | **Wireshark** ❌ Skip | Only needed for advanced debugging |

---

## 🔧 Implementation Guide

### 1. Backend Testing (Keep & Improve)

#### Current Setup ✅
You already have:
- **JUnit 5** for unit tests
- **Rest Assured** for API integration tests
- **JaCoCo** for code coverage
- **Mockito** for mocking

#### How to Run Backend Tests
```powershell
# Run all tests
cd auth-backend
.\mvnw test

# Run with coverage report
.\mvnw test jacoco:report
# Report will be in: target/site/jacoco/index.html

# Run specific test class
.\mvnw test -Dtest=UserServiceTest

# Run only integration tests
.\mvnw verify
```

#### Adding More Tests (Recommended)
```java
// Add integration test for API endpoints
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class UserControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void testGetUserProfile() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").exists());
    }
}
```

---

### 2. Frontend Testing (Keep & Improve)

#### Current Setup ✅
You already have:
- **Vitest** for unit/component tests
- **React Testing Library** for component testing
- **Axe** for accessibility testing
- **Coverage** with V8

#### How to Run Frontend Tests
```powershell
cd admin-web

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific file
npm test Profile.test.tsx

# Watch mode
npm test -- --watch

# Run accessibility tests only
npm test -- accessibility/
```

#### Your Current Accessibility Test Example
```typescript
// src/accessibility/login.a11y.test.tsx
import { axe } from 'vitest-axe'

it('has no accessibility violations', async () => {
  const { container } = render(<Login />)
  const results = await axe(container)
  expect(results.violations).toHaveLength(0)
})
```

---

### 3. Add Playwright for E2E Testing (RECOMMENDED)

#### Why Playwright Instead of Selenium?
- ⚡ **Faster** - Built for modern web apps
- ✅ **More reliable** - Auto-waits, better selectors
- 🎯 **Better for React** - Designed for SPAs
- 🔧 **Easier setup** - No external drivers

#### Installation
```powershell
cd admin-web
npm install -D @playwright/test
npx playwright install
```

#### Create First E2E Test
```typescript
// admin-web/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('user can login successfully', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login')
    
    // Fill in credentials
    await page.fill('[name="email"]', 'admin@itcenter.com')
    await page.fill('[name="password"]', 'password123')
    
    // Click login button
    await page.click('button[type="submit"]')
    
    // Wait for redirect and verify dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=Welcome')).toBeVisible()
  })
  
  test('login fails with wrong credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login')
    await page.fill('[name="email"]', 'wrong@email.com')
    await page.fill('[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })
})
```

#### Playwright Config
```typescript
// admin-web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### Run Playwright Tests
```powershell
# Run all E2E tests
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run with UI mode
npx playwright test --ui

# See test report
npx playwright show-report
```

#### Add to package.json
```json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

### 4. Mobile Testing (Keep Flutter Test)

#### Current Setup ✅
Flutter's built-in testing is perfect. You don't need Appium.

#### How to Run Mobile Tests
```powershell
cd mobile-app

# Run all tests
flutter test

# Run specific file
flutter test test/profile_widget_test.dart

# Run with coverage
flutter test --coverage

# Run integration tests
flutter test integration_test/

# Golden tests (UI snapshots)
flutter test --update-goldens
```

#### Add Golden Tests (RECOMMENDED)
```dart
// test/profile_screen_test.dart
import 'package:flutter_test/flutter_test.dart'
import 'package:itcenter_auth/src/screens/profile_screen.dart'

void main() {
  testWidgets('profile screen matches golden', (tester) async {
    await tester.pumpWidget(ProfileScreen())
    
    await expectLater(
      find.byType(ProfileScreen),
      matchesGoldenFile('goldens/profile_screen.png'),
    )
  })
}
```

---

### 5. Security Testing with OWASP ZAP

#### Why Add This?
- 🔒 Finds security vulnerabilities automatically
- ✅ Checks for SQL injection, XSS, CSRF
- 🎯 Required for production deployments

#### Installation & Setup
```powershell
# Pull OWASP ZAP Docker image
docker pull owasp/zap2docker-stable

# Run baseline scan (quick check)
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080

# Run full scan (comprehensive)
docker run -t owasp/zap2docker-stable zap-full-scan.py -t http://localhost:8080
```

#### Save Results
```powershell
# Scan and save HTML report
docker run -v "$(pwd):/zap/wrk" -t owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:8080 -r zap_report.html
```

#### Run on Backend
```powershell
# Make sure backend is running first
cd auth-backend
.\start.bat

# In another terminal, run ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080

# Expected output: LOW/HIGH risk alerts
```

#### Add Security Tests to CI/CD
```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on: [push, pull_request]

jobs:
  zap_scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'http://localhost:8080'
```

---

### 6. Manual API Testing with Postman

#### Current Setup ✅
You have Postman collections in `tests/postman/`

#### How to Use
```powershell
# Import collection into Postman
# File: tests/postman/auth-endpoints.json

# Or use Newman CLI for automation
npm install -g newman

# Run Postman collection
newman run tests/postman/auth-endpoints.json
```

#### Add Automated Postman Tests
```powershell
# Install Newman
npm install -D newman

# Run collection
npx newman run tests/postman/auth-endpoints.json

# Run with environment
npx newman run tests/postman/auth-endpoints.json \
  -e tests/postman/local-env.json
```

---

## 🎯 Practical Testing Workflow

### Daily Development Workflow

```powershell
# 1. Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# 2. In Terminal 1: Start backend
cd auth-backend
.\start.bat

# 3. In Terminal 2: Start frontend
cd admin-web
npm run dev

# 4. In Terminal 3: Run tests while developing

# Backend unit tests
cd auth-backend
.\mvnw test

# Frontend tests (watch mode)
cd admin-web
npm test -- --watch

# When done, run E2E tests
cd admin-web
npm run test:e2e
```

### Pre-Commit Checklist

```powershell
# 1. Run all backend tests
cd auth-backend && .\mvnw test

# 2. Run all frontend tests
cd admin-web && npm test

# 3. Run mobile tests
cd mobile-app && flutter test

# 4. Check coverage
cd admin-web && npm run test:coverage
# Coverage should be > 80%

# 5. Run accessibility tests
cd admin-web && npm test -- accessibility/
```

### Before Production Deployment

```powershell
# 1. Run all tests with coverage
# Backend
cd auth-backend
.\mvnw test jacoco:report

# Frontend
cd admin-web
npm run test:coverage

# Mobile
cd mobile-app
flutter test --coverage

# 2. Run E2E tests
cd admin-web
npm run test:e2e

# 3. Security scan
docker run -t owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:8080

# 4. Lint check
cd admin-web
npm run lint

cd auth-backend
.\mvnw checkstyle:check
```

---

## 📊 Test Coverage Goals

| Module | Current | Target | Tool |
|--------|---------|--------|------|
| Backend Services | ~60% | 80%+ | JUnit + JaCoCo |
| Backend Controllers | ~40% | 80%+ | Rest Assured |
| Frontend Components | ~50% | 80%+ | Vitest |
| Frontend Accessibility | 100% | 100% | Axe |
| E2E Critical Flows | 0% | 100% | Playwright |
| Security Scan | 0% | 100% | OWASP ZAP |

---

## 🔧 Tool Installation Summary

### Tools You Already Have ✅
```powershell
# Backend
✅ JUnit 5 (via Spring Boot)
✅ Rest Assured (in pom.xml)
✅ JaCoCo (in pom.xml)
✅ Mockito (via Spring Boot Test)

# Frontend
✅ Vitest
✅ React Testing Library
✅ Axe (vitest-axe)
✅ Coverage (v8)

# Mobile
✅ Flutter Test (built-in)
```

### Tools to Add ➕
```powershell
# Add Playwright for E2E testing
cd admin-web
npm install -D @playwright/test
npx playwright install

# OWASP ZAP (via Docker - no installation needed)
docker pull owasp/zap2docker-stable

# Optional: Newman for Postman automation
npm install -g newman
```

---

## 📝 Quick Commands Cheat Sheet

```powershell
# ============================================
# BACKEND TESTS
# ============================================
cd auth-backend

# Run all tests
.\mvnw test

# Run with coverage
.\mvnw test jacoco:report

# Open coverage report
start target\site\jacoco\index.html

# ============================================
# FRONTEND TESTS
# ============================================
cd admin-web

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests (after adding Playwright)
npm run test:e2e

# Run accessibility tests only
npm test -- accessibility/

# ============================================
# MOBILE TESTS
# ============================================
cd mobile-app

# Run all tests
flutter test

# Run with coverage
flutter test --coverage

# ============================================
# SECURITY SCAN
# ============================================
# Make sure backend is running first
docker run -t owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:8080

# ============================================
# POSTMAN AUTOMATION
# ============================================
newman run tests/postman/auth-endpoints.json
```

---

## 🎯 Summary

### ✅ Keep Using These Tools
1. **JUnit 5** - Perfect for backend unit tests
2. **Rest Assured** - Perfect for API integration tests
3. **Vitest** - Perfect for React unit/component tests
4. **Axe** - Perfect for accessibility testing
5. **Flutter Test** - Perfect for mobile widget tests
6. **Postman** - Perfect for manual API testing

### ➕ Add These Tools
1. **Playwright** - For E2E web testing (replaces need for Selenium)
2. **OWASP ZAP** - For security scanning
3. **Newman** (optional) - For Postman automation

### ❌ Skip These Tools
1. **Selenium** - Use Playwright instead
2. **Appium** - Use Flutter Test instead
3. **Wireshark** - Only if debugging specific network issues

---

## 📚 Next Steps

1. **Week 1**: Improve current test coverage to 80%+
2. **Week 2**: Add Playwright for critical E2E flows
3. **Week 3**: Add OWASP ZAP security scans to CI/CD
4. **Week 4**: Set up automated test reporting and monitoring

