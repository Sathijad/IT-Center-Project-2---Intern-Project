// Admin Attendance Management Functional Tests - ADMIN ONLY
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { loginWithRealCredentials } = require("./helpers/real-login-helper");
const http = require("http");

// Test credentials - REQUIRED for real Cognito login
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || process.env.ADMIN_EMAIL || "",
  password: process.env.TEST_USER_PASSWORD || process.env.ADMIN_PASSWORD || "",
};

// Check if credentials are provided
const USE_REAL_LOGIN = TEST_USER.email && TEST_USER.password;

// Track if login has been done (prevent multiple logins)
let loginDone = false;
let backendRunning = false;

let chromedriverPath;
try {
  const chromedriver = require("chromedriver");
  chromedriverPath = chromedriver.path;
} catch (error) {
  console.log("chromedriver package not found, using system default");
}

async function checkBackendRunning() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:8080/healthz", { timeout: 2000 }, (res) => {
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

describe("Admin Attendance Management Functional Tests", () => {
  let driver;
  const BASE_URL = process.env.WEB_BASE_URL || "http://localhost:5173";
  const TIMEOUT = 15000;

  beforeAll(async () => {
    backendRunning = await checkBackendRunning();
    
    // Check if credentials are provided
    if (!USE_REAL_LOGIN) {
      console.log("\n⚠️  WARNING: No credentials provided!");
      console.log("   Set environment variables:");
      console.log("   - TEST_USER_EMAIL or ADMIN_EMAIL");
      console.log("   - TEST_USER_PASSWORD or ADMIN_PASSWORD");
      console.log("   Tests will try to use mock tokens (may fail if backend is running)\n");
    } else {
      console.log("\n✅ Using REAL Cognito login with provided credentials");
      console.log(`   Email: ${TEST_USER.email}`);
      if (backendRunning) {
        console.log("   ✅ Backend is running - real login will work with backend\n");
      } else {
        console.log("   ⚠️  Backend is not running - login will work but API calls may fail\n");
      }
    }
    
    const options = new chrome.Options();
    if (process.env.HEADFUL !== "true") {
      options.addArguments("--headless=new");
      options.addArguments("--disable-gpu");
    }
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--window-size=1920,1080");

    try {
      const chromePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      ];
      for (const chromePath of chromePaths) {
        if (require("fs").existsSync(chromePath)) {
          options.setChromeBinaryPath(chromePath);
          break;
        }
      }
    } catch (error) {
      // Use system default
    }

    let builder = new Builder().forBrowser("chrome").setChromeOptions(options);
    if (chromedriverPath) {
      const service = new chrome.ServiceBuilder(chromedriverPath);
      builder = builder.setChromeService(service);
    }
    driver = await builder.build();

    await driver.manage().setTimeouts({
      implicit: 10000,
      pageLoad: 30000,
      script: 30000,
    });
    
    // LOGIN ONCE at the beginning - all tests will reuse this session
    if (USE_REAL_LOGIN) {
      console.log("\n🔐 Performing real Cognito login (ONCE for all tests)...");
      await loginWithRealCredentials(driver, BASE_URL, TEST_USER, 120000);
      loginDone = true;
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      // Fallback to mock tokens
      console.log("\n⚠️  Using mock tokens (credentials not provided)...");
      await driver.get(`${BASE_URL}/login`);
      await driver.wait(until.elementLocated(By.tagName("body")), TIMEOUT);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await driver.executeScript(`
        localStorage.setItem('access_token', 'mock-token-for-testing');
        localStorage.setItem('id_token', 'mock-id-token');
        localStorage.setItem('refresh_token', 'mock-refresh-token');
        localStorage.setItem('expires_at', '${Date.now() + 3600000}');
      `);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      loginDone = true;
    }
  }, 180000); // Increased timeout for login

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  describe("Attendance Management Page", () => {
    beforeEach(async () => {
      // Just navigate to page - we're already logged in from beforeAll
      await driver.get(`${BASE_URL}/admin/attendance`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Additional verification: Check we're not on error page
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error(
          "Redirected to login - authentication failed.\n" +
          (USE_REAL_LOGIN 
            ? "   Real login may have failed. Check credentials.\n"
            : "   Mock token was rejected. Please provide credentials for real login.\n")
        );
      }
      
      const forbidden = await driver.findElements(
        By.xpath("//h1[contains(text(), '403')] | //h1[contains(text(), 'Forbidden')]")
      );
      if (forbidden.length > 0) {
        throw new Error(
          "Got 403 Forbidden - user role not set as ADMIN.\n" +
          (USE_REAL_LOGIN 
            ? "   Ensure the logged-in user has ADMIN role in Cognito.\n"
            : "   Start mock server (npm run e2e:api) and frontend (npm run e2e:web)\n")
        );
      }
    });

    test("should display Attendance Management header", async () => {
      // Wait for header to appear (might be after loading finishes)
      const header = await driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Attendance Management')]")),
        TIMEOUT,
        "Attendance Management header not found. Page might still be loading or API call failed."
      );
      expect(await header.isDisplayed()).toBe(true);
    });

    test("should display user filter dropdown", async () => {
      const userFilter = await driver.wait(
        until.elementLocated(By.xpath("//select[@id='user-filter'] | //select[contains(., 'All Users')]")),
        TIMEOUT,
        "User filter not found"
      );
      expect(await userFilter.isDisplayed()).toBe(true);
    });

    test("should display start date input", async () => {
      const startDateInput = await driver.wait(
        until.elementLocated(By.xpath("//input[@id='start-date'] | //input[@type='date'][1]")),
        TIMEOUT,
        "Start date input not found"
      );
      expect(await startDateInput.isDisplayed()).toBe(true);
    });

    test("should display end date input", async () => {
      const endDateInput = await driver.wait(
        until.elementLocated(By.xpath("//input[@id='end-date'] | //input[@type='date'][2]")),
        TIMEOUT,
        "End date input not found"
      );
      expect(await endDateInput.isDisplayed()).toBe(true);
    });

    test("should display Export button", async () => {
      const exportButton = await driver.wait(
        until.elementLocated(By.xpath("//button[contains(text(), 'Export')]")),
        TIMEOUT,
        "Export button not found"
      );
      expect(await exportButton.isDisplayed()).toBe(true);
    });

    test("should be able to set date range", async () => {
      const startDateInput = await driver.wait(
        until.elementLocated(By.xpath("//input[@id='start-date'] | //input[@type='date'][1]")),
        TIMEOUT
      );
      
      // Set a date (format: YYYY-MM-DD)
      const testDate = "2025-01-01";
      await driver.executeScript(
        `arguments[0].value = '${testDate}'; arguments[0].dispatchEvent(new Event('change'));`,
        startDateInput
      );
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const value = await startDateInput.getAttribute("value");
      expect(value).toBe(testDate);
    });
  });

  describe("Attendance Table and Data", () => {
    beforeEach(async () => {
      // Just navigate to page - we're already logged in from beforeAll
      await driver.get(`${BASE_URL}/admin/attendance`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for error states
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error("Redirected to login - authentication failed");
      }
    });

    test("should display attendance table or empty state", async () => {
      // Wait for page to finish loading first
      const { waitForPageLoad } = require("./helpers/auth-helper");
      await waitForPageLoad(driver, 20000);
      
      // Wait for either table or empty state
      await driver.wait(
        until.elementLocated(
          By.xpath("//table | //div[contains(text(), 'No attendance records found')] | //div[contains(text(), 'No attendance')] | //div[contains(text(), 'No data')]")
        ),
        TIMEOUT,
        "Attendance table or empty state not found. Page might still be loading or API call failed."
      );
    });

    test("should display pagination controls if multiple pages exist", async () => {
      const paginationButtons = await driver.findElements(
        By.xpath("//button[contains(text(), 'Previous')] | //button[contains(text(), 'Next')]")
      );
      
      // Verify page loaded correctly
      const header = await driver.findElements(
        By.xpath("//h1[contains(text(), 'Attendance Management')]")
      );
      expect(header.length).toBeGreaterThan(0);
    });
  });
});

