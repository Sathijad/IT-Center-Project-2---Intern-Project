# UI Automation Tests

Selenium WebDriver tests for the IT Center Admin Portal (React + Vite).

## 📋 Overview

This test suite validates the admin portal UI functionality including:
- Authentication flow (with Cognito bypass for CI)
- User role management
- Audit log viewing
- Accessibility compliance

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Chrome browser installed
- Backend running on `http://localhost:8080`
- Frontend running on `http://localhost:5173`

### Installation

```powershell
cd admin-web
npm install
```

This will install all required dependencies:
- `selenium-webdriver` - WebDriver API
- `chromedriver` - Chrome automation
- `mocha` - Test framework
- `chai` - Assertion library
- `ts-node` - TypeScript runtime

## 🚀 Running Tests

### Default (Headless)

```powershell
npm run ui:test
```

### Visible Browser (for debugging)

```powershell
$env:HEADFUL="true"
npm run ui:test
```

### Run Specific Test

```powershell
npx mocha -r ts-node/register tests/ui/login.spec.ts --timeout 60000
```

### Environment Variables

```powershell
# Set base URL (healthy: http://localhost:5173)
$env:WEB_BASE_URL="http://localhost:5173"

# Enable visible browser (default: headless)
$env:HEADFUL="true"

# Set test user token (for bypassing Cognito)
$env:TEST_USER_TOKEN="your-jwt-token-here"
```

## 📁 Project Structure

```
tests/ui/
├── helpers/
│   ├── test-base.ts      # Driver setup, utilities
│   └── test-data.ts      # Test constants and data
├── page-objects/
│   ├── LoginPage.ts      # Login page actions
│   ├── DashboardPage.ts  # Dashboard verifications
│   ├── UsersPage.ts      # User management actions
│   └── AuditPage.ts      # Audit log verifications
├── login.spec.ts         # Login flow tests
├── users.roles.spec.ts   # Role management tests
├── audit.spec.ts         # Audit log tests
├── a11y.smoke.spec.ts    # Accessibility tests
└── README.md            # This file
```

## 🧪 Test Suites

### 1. Login Flow (`login.spec.ts`)

Tests the authentication flow with pre-seeded tokens for CI.

**Scenarios:**
- Bypass Cognito with mock token
- Navigate to dashboard
- Display login page
- Click "Sign in with Cognito"

### 2. User Role Management (`users.roles.spec.ts`)

Tests role assignment/removal functionality (idempotent).

**Scenarios:**
- Search users by email
- Open role management modal
- Toggle role checkboxes
- Save and revert changes
- Verify idempotent operations

**Note:** Uses a test user (configurable in `test-data.ts`)

### 3. Audit Log (`audit.spec.ts`)

Tests audit log viewing and filtering.

**Scenarios:**
- Navigate to audit page
- View audit events
- Filter by user
- Verify role assignment/removal events
- Check event counts

### 4. Accessibility (`a11y.smoke.spec.ts`)

Tests accessibility compliance using axe-core.

**Scenarios:**
- Inject axe-core via CDN
- Scan for critical violations
- Verify keyboard navigation
- Check ARIA attributes
- Validate color contrast

## 🎯 Page Object Model

Each page has a corresponding Page Object class that encapsulates:
- Page navigation
- Element selectors
- Common actions
- Verification methods

### Example Usage

```typescript
import { DashboardPage } from './page-objects/DashboardPage';

const dashboard = new DashboardPage(driver);
await dashboard.open();
const email = await dashboard.getUserEmail();
expect(email).to.equal('user@example.com');
```

## 🔧 Configuration

### Test Configuration

- **Timeout:** 60 seconds per test
- **Browser:** Chrome (headless by default)
- **Window Size:** 1920x1080

### Debugging Tips

1. **Enable visible browser:** Set `HEADFUL=true`
2. **Add waits:** Use `await driver.sleep(2000)` to pause execution
3. **Screenshots:** Add `await driver.takeScreenshot()`
4. **Console logs:** Check browser console with `driver.manage().logs().get('browser')`

## ⚠️ Known Issues

1. **Mock Tokens:** Current tests use placeholder tokens. For real authentication testing, you'll need valid JWT tokens from your Cognito setup.
2. **Alert Dialogs:** The app uses native `alert()` for success messages, which Selenium handles automatically but may need adjustment.
3. **Network Delays:** Some tests include delays for loading - may need adjustment based on your environment.

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run UI Tests
  run: |
    cd admin-web
    npm install
    npm run ui:test
  env:
    WEB_BASE_URL: http://localhost:5173
    HEADFUL: false
```

### Docker Example

```dockerfile
FROM node:18
WORKDIR /app
COPY admin-web/ ./
RUN npm install
CMD ["npm", "run", "ui:test"]
```

## 📊 Test Results

Test results are displayed in the console with:
- ✅ Passed tests
- ❌ Failed tests
- ⏱️ Execution time
- 📝 Detailed error messages

## 🤝 Contributing

When adding new tests:

1. Create a new Page Object if needed
2. Follow existing patterns
3. Make tests idempotent (safe to run repeatedly)
4. Add proper waits for async operations
5. Include descriptive test names and comments

## 📚 Resources

- [Selenium WebDriver Docs](https://www.selenium.dev/documentation/)
- [Mocha Testing Framework](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)
- [axe-core Accessibility](https://github.com/dequelabs/axe-core)

