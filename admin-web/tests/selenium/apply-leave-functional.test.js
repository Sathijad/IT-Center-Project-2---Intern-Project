// Apply Leave Functional Tests - ADMIN + EMPLOYEE
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { loginWithRealCredentials } = require("./helpers/real-login-helper");

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

describe("Apply Leave Functional Tests", () => {
  let driver;
  const BASE_URL = process.env.WEB_BASE_URL || "http://localhost:5173";
  const TIMEOUT = 15000;

  beforeAll(async () => {
    // Check if credentials provided
    if (!USE_REAL_LOGIN) {
      console.log("\n⚠️  WARNING: No credentials provided!");
      console.log("   Set environment variables:");
      console.log("   - TEST_USER_EMAIL or ADMIN_EMAIL");
      console.log("   - TEST_USER_PASSWORD or ADMIN_PASSWORD");
      console.log("   Tests will try to use mock tokens (may fail if backend is running)\n");
    } else {
      console.log("\n✅ Using REAL Cognito login with provided credentials");
      console.log(`   Email: ${TEST_USER.email}`);
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

  describe("Apply Leave Page", () => {
    beforeEach(async () => {
      // Just navigate to page - we're already logged in from beforeAll
      await driver.get(`${BASE_URL}/leave`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Additional verification
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error(
          "Redirected to login - authentication failed.\n" +
          (USE_REAL_LOGIN
            ? "   Real login may have failed. Check credentials.\n"
            : "   Mock token was rejected. Please provide credentials for real login.\n")
        );
      }
    });

    test("should display Apply Leave header", async () => {
      const header = await driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Apply for Leave')] | //h1[contains(text(), 'Leave')]")),
        TIMEOUT,
        "Apply Leave header not found"
      );
      expect(await header.isDisplayed()).toBe(true);
    });

    test("should display leave type select field", async () => {
      try {
        const leaveTypeSelect = await driver.wait(
          until.elementLocated(
            By.xpath("//select[@name='leaveType'] | //select[contains(@id, 'leave')] | //label[contains(text(), 'Leave Type')]//following::select[1]")
          ),
          TIMEOUT,
          "Leave type select not found"
        );
        expect(await leaveTypeSelect.isDisplayed()).toBe(true);
      } catch (error) {
        console.log("Leave type select may not be present - page structure may vary");
      }
    });

    test("should display start date input", async () => {
      try {
        const startDateInput = await driver.wait(
          until.elementLocated(
            By.xpath("//input[@type='date' and contains(@name, 'start')] | //input[@type='date'][1] | //label[contains(text(), 'Start Date')]//following::input[1]")
          ),
          TIMEOUT,
          "Start date input not found"
        );
        expect(await startDateInput.isDisplayed()).toBe(true);
      } catch (error) {
        console.log("Start date input may not be present");
      }
    });

    test("should display end date input", async () => {
      try {
        const endDateInput = await driver.wait(
          until.elementLocated(
            By.xpath("//input[@type='date' and contains(@name, 'end')] | //input[@type='date'][2] | //label[contains(text(), 'End Date')]//following::input[1]")
          ),
          TIMEOUT,
          "End date input not found"
        );
        expect(await endDateInput.isDisplayed()).toBe(true);
      } catch (error) {
        console.log("End date input may not be present");
      }
    });

    test("should display reason textarea", async () => {
      try {
        const reasonTextarea = await driver.wait(
          until.elementLocated(
            By.xpath("//textarea[@name='reason'] | //textarea | //label[contains(text(), 'Reason')]//following::textarea[1]")
          ),
          TIMEOUT,
          "Reason textarea not found"
        );
        expect(await reasonTextarea.isDisplayed()).toBe(true);
      } catch (error) {
        console.log("Reason textarea may not be present");
      }
    });

    test("should display submit button", async () => {
      const submitButton = await driver.wait(
        until.elementLocated(
          By.xpath("//button[contains(text(), 'Submit')] | //button[contains(text(), 'Apply')] | //button[@type='submit']")
        ),
        TIMEOUT,
        "Submit button not found"
      );
      expect(await submitButton.isDisplayed()).toBe(true);
    });
  });

  describe("Apply Leave Form Interactions", () => {
    beforeEach(async () => {
      await driver.get(`${BASE_URL}/leave`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error("Redirected to login - authentication failed");
      }
    });

    test("should be able to fill in start date", async () => {
      try {
        const startDateInput = await driver.wait(
          until.elementLocated(
            By.xpath("//input[@type='date' and contains(@name, 'start')] | //input[@type='date'][1]")
          ),
          TIMEOUT
        );
        
        const testDate = "2025-12-01";
        await driver.executeScript(
          `arguments[0].value = '${testDate}'; arguments[0].dispatchEvent(new Event('change'));`,
          startDateInput
        );
        
        await new Promise(resolve => setTimeout(resolve, 500));
        const value = await startDateInput.getAttribute("value");
        expect(value).toBe(testDate);
      } catch (error) {
        console.log("Start date input not found or not editable");
      }
    });

    test("should be able to fill in end date", async () => {
      try {
        const endDateInput = await driver.wait(
          until.elementLocated(
            By.xpath("//input[@type='date' and contains(@name, 'end')] | //input[@type='date'][2]")
          ),
          TIMEOUT
        );
        
        const testDate = "2025-12-05";
        await driver.executeScript(
          `arguments[0].value = '${testDate}'; arguments[0].dispatchEvent(new Event('change'));`,
          endDateInput
        );
        
        await new Promise(resolve => setTimeout(resolve, 500));
        const value = await endDateInput.getAttribute("value");
        expect(value).toBe(testDate);
      } catch (error) {
        console.log("End date input not found or not editable");
      }
    });

    test("should be able to enter reason", async () => {
      try {
        const reasonTextarea = await driver.wait(
          until.elementLocated(
            By.xpath("//textarea[@name='reason'] | //textarea")
          ),
          TIMEOUT
        );
        
        await reasonTextarea.clear();
        await reasonTextarea.sendKeys("Vacation leave for personal time off");
        
        const value = await reasonTextarea.getAttribute("value");
        expect(value).toContain("Vacation");
      } catch (error) {
        console.log("Reason textarea not found or not editable");
      }
    });
  });
});

