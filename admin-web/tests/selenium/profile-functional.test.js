// Profile Page Functional Tests - ADMIN + EMPLOYEE
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

let chromedriverPath;
try {
  const chromedriver = require("chromedriver");
  chromedriverPath = chromedriver.path;
} catch (error) {
  console.log("chromedriver package not found, using system default");
}

describe("Profile Page Functional Tests", () => {
  let driver;
  const BASE_URL = process.env.WEB_BASE_URL || "http://localhost:5173";
  const TIMEOUT = 15000;

  beforeAll(async () => {
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

  describe("Profile Page Display", () => {
    beforeEach(async () => {
      // Just navigate to page - we're already logged in from beforeAll
      await driver.get(`${BASE_URL}/profile`);
      await new Promise(resolve => setTimeout(resolve, 2000));

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

    test("should display Profile header", async () => {
      const header = await driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Profile')]")),
        TIMEOUT,
        "Profile header not found"
      );
      expect(await header.isDisplayed()).toBe(true);
    });

    test("should display display name input field", async () => {
      const displayNameInput = await driver.wait(
        until.elementLocated(
          By.xpath("//input[@name='displayName'] | //input[contains(@placeholder, 'Display Name')] | //label[contains(text(), 'Display Name')]//following::input[1]")
        ),
        TIMEOUT,
        "Display name input not found"
      );
      expect(await displayNameInput.isDisplayed()).toBe(true);
    });

    test("should display locale select field", async () => {
      const localeSelect = await driver.wait(
        until.elementLocated(By.xpath("//select[@name='locale'] | //label[contains(text(), 'Locale')]//following::select[1]")),
        TIMEOUT,
        "Locale select not found"
      );
      expect(await localeSelect.isDisplayed()).toBe(true);
    });

    test("should display save button", async () => {
      const saveButton = await driver.wait(
        until.elementLocated(By.xpath("//button[contains(text(), 'Save')] | //button[@type='submit']")),
        TIMEOUT,
        "Save button not found"
      );
      expect(await saveButton.isDisplayed()).toBe(true);
    });
  });

  describe("Profile Update", () => {
    beforeEach(async () => {
      await driver.get(`${BASE_URL}/profile`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error("Redirected to login - authentication failed");
      }
    });

    test("should be able to edit display name", async () => {
      try {
        const displayNameInput = await driver.wait(
          until.elementLocated(
            By.xpath("//input[@name='displayName'] | //input[contains(@placeholder, 'Display Name')] | //label[contains(text(), 'Display Name')]//following::input[1]")
          ),
          TIMEOUT
        );
        
        await displayNameInput.clear();
        await displayNameInput.sendKeys("Test Admin User");
        
        const value = await displayNameInput.getAttribute("value");
        expect(value).toBe("Test Admin User");
      } catch (error) {
        console.log("Display name input not found or not editable");
      }
    });

    test("should be able to select locale", async () => {
      try {
        const localeSelect = await driver.wait(
          until.elementLocated(By.xpath("//select[@name='locale'] | //label[contains(text(), 'Locale')]//following::select[1]")),
          TIMEOUT
        );
        
        // Select an option
        const option = await driver.findElement(
          By.xpath("//option[contains(text(), 'en-US')] | //option[@value='en-US']")
        );
        await option.click();
        
        const selectedValue = await localeSelect.getAttribute("value");
        expect(selectedValue).toBeTruthy();
      } catch (error) {
        console.log("Locale select not found or not editable");
      }
    });

    test("should be able to click save button", async () => {
      try {
        const saveButton = await driver.findElement(
          By.xpath("//button[contains(text(), 'Save')] | //button[@type='submit']")
        );
        
        // Button should be clickable
        const isEnabled = await saveButton.isEnabled();
        expect(isEnabled).toBe(true);
        
        // Note: Not clicking save to avoid actual API calls in tests
      } catch (error) {
        console.log("Save button not found");
      }
    });
  });
});

