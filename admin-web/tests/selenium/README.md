# Selenium Tests - Simple Approach (Jest + CommonJS)

This directory contains Selenium UI automation tests using **Jest** and **CommonJS** (like your friend's approach). This avoids the ESM/TypeScript module resolution issues.

## 🎯 Why This Approach?

- ✅ **Uses Jest** (already installed for a11y tests)
- ✅ **Uses CommonJS** (no ESM import issues)
- ✅ **Simple structure** (like your friend's code)
- ✅ **Works out of the box** (no complex configuration)

## 🚀 Running Tests

### Run All Selenium Tests

```powershell
cd admin-web
npm run selenium:test
```

### Run with Visible Browser

```powershell
$env:HEADFUL="true"
npm run selenium:test:headful
```

### Run Specific Test

```powershell
npx jest tests/selenium/admin-dashboard.test.js
```

## 📋 Prerequisites

**IMPORTANT:** Frontend must be running!

```powershell
# Terminal 1 - Start frontend
cd admin-web
npm run dev

# Terminal 2 - Run tests
cd admin-web
npm run selenium:test
```

## 🧪 Test Structure

### Current Tests

- **admin-dashboard.test.js** - Login flow and navigation tests

### Test Flow

1. **Login Flow** - Tests login page and Cognito redirect
2. **Dashboard Navigation** - Tests dashboard with mock tokens
3. **Navigation Tests** - Tests navigation to different pages
4. **Screenshot Capture** - Captures screenshots for debugging

## 🔐 Authentication

Tests support two modes:

### Mode 1: Mock Tokens (Default)
- Automatically sets mock tokens in localStorage
- No actual login required
- Fast and reliable

### Mode 2: Real Cognito Login (Optional)
Set environment variables:
```powershell
$env:TEST_USER_EMAIL="your-email@example.com"
$env:TEST_USER_PASSWORD="your-password"
npm run selenium:test
```

## 📝 Writing New Tests

Follow this pattern:

```javascript
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

describe("Your Test Suite", () => {
  let driver;
  const BASE_URL = process.env.WEB_BASE_URL || "http://localhost:5173";

  beforeAll(async () => {
    const options = new chrome.Options();
    if (process.env.HEADFUL !== "true") {
      options.addArguments("--headless=new");
    }
    options.addArguments("--no-sandbox", "--disable-dev-shm-usage");
    
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();
  }, 60000);

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  test("should do something", async () => {
    await driver.get(`${BASE_URL}/your-page`);
    // Your test code here
  });
});
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEB_BASE_URL` | Frontend URL | `http://localhost:5173` |
| `HEADFUL` | Show browser | `false` |
| `TEST_USER_EMAIL` | Real login email | (none) |
| `TEST_USER_PASSWORD` | Real login password | (none) |

### Chrome Options

The tests automatically:
- Use headless mode (unless `HEADFUL=true`)
- Try to find Chrome binary automatically
- Set appropriate window size
- Configure timeouts

## 📊 Screenshots

Screenshots are automatically saved to `screenshots/` directory:
- On test completion
- Can be manually triggered in tests

## 🐛 Troubleshooting

### Tests Fail with Connection Refused

**Solution:** Start the frontend:
```powershell
npm run dev
```

### Chrome Not Found

**Solution:** Tests will use system default Chrome. If issues persist, manually set path in test file.

### Tests Timeout

**Solution:** Increase timeout in `setup.js` or test file:
```javascript
jest.setTimeout(120000); // 2 minutes
```

## 📚 Comparison with Mocha Tests

| Feature | Jest (This) | Mocha (tests/ui) |
|---------|-------------|------------------|
| Module System | CommonJS | ES Modules |
| Syntax | `test()`, `expect()` | `it()`, `expect()` |
| Setup | `beforeAll()` | `before()` |
| Configuration | Simpler | More complex |
| TypeScript | Not needed | Required |

## ✨ Advantages

1. **No ESM issues** - CommonJS works everywhere
2. **Simpler** - Less configuration needed
3. **Familiar** - Matches your friend's approach
4. **Reliable** - Fewer moving parts

## 📝 Notes

- Tests use Jest (already installed)
- No TypeScript compilation needed
- Works with existing Jest setup
- Can coexist with Mocha tests

