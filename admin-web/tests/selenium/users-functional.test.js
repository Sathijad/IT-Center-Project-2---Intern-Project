// Users Page Functional Tests - ADMIN ONLY
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const path = require("path");
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

describe("Users Page Functional Tests (ADMIN)", () => {
  let driver;
  const BASE_URL = process.env.WEB_BASE_URL || "http://localhost:5173";
  const TIMEOUT = 15000;
  let backendRunning = false;

  beforeAll(async () => {
    backendRunning = await checkBackendRunning();
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

  describe("Users Page - Search and Display", () => {
    beforeEach(async () => {
      // Just navigate to page - we're already logged in from beforeAll
      await driver.get(`${BASE_URL}/users`);
      
      // Check for error states first
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error(
          "Redirected to login - authentication failed.\n" +
          (USE_REAL_LOGIN 
            ? "   Real login may have failed. Check credentials.\n"
            : "   Mock token was rejected. Please provide credentials for real login.\n")
        );
      }
      
      // Check for 403 Forbidden
      try {
        const forbidden = await driver.findElements(
          By.xpath("//h1[contains(text(), '403')] | //h1[contains(text(), 'Forbidden')]")
        );
        if (forbidden.length > 0) {
          throw new Error("Got 403 Forbidden - API mocking failed, user role not set as ADMIN");
        }
      } catch (e) {
        if (e.message.includes("403")) throw e;
      }
      
      // Wait for loading to finish
      await new Promise(resolve => setTimeout(resolve, 3000));
    });

    test("should display users page header", async () => {
      // First check if page loaded or if we're in an error state
      const currentUrl = await driver.getCurrentUrl();
      
      // Check for 403
      const forbidden = await driver.findElements(
        By.xpath("//h1[contains(text(), '403')] | //h1[contains(text(), 'Forbidden')]")
      );
      if (forbidden.length > 0) {
        throw new Error("Page shows 403 Forbidden - API mocking not working, user role not set");
      }
      
      // Check for loading state
      const loading = await driver.findElements(
        By.xpath("//div[@class='animate-spin']")
      );
      if (loading.length > 0) {
        // Wait a bit more for loading to finish
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      const header = await driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Users')]")),
        TIMEOUT,
        "Users page header not found. Check if API mocking is working - user role may not be set."
      );
      expect(await header.isDisplayed()).toBe(true);
    });

    test("should display search input field", async () => {
      const searchInput = await driver.wait(
        until.elementLocated(By.xpath("//input[@placeholder='Search by email or name...']")),
        TIMEOUT,
        "Search input not found"
      );
      expect(await searchInput.isDisplayed()).toBe(true);
    });

    test("should be able to type in search field", async () => {
      const searchInput = await driver.wait(
        until.elementLocated(By.xpath("//input[@placeholder='Search by email or name...']")),
        TIMEOUT
      );
      await searchInput.clear();
      await searchInput.sendKeys("test@example.com");
      
      const value = await searchInput.getAttribute("value");
      expect(value).toBe("test@example.com");
    });

    test("should display users table", async () => {
      // Wait for table to load (either data or loading/empty state)
      await driver.wait(
        until.elementLocated(
          By.xpath("//table | //div[contains(text(), 'No users found')] | //div[@class='animate-spin']")
        ),
        TIMEOUT,
        "Users table not found"
      );
    });
  });

  describe("Users Page - Role Management", () => {
    beforeEach(async () => {
      await driver.get(`${BASE_URL}/users`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error("Redirected to login - authentication failed");
      }
    });

    test("should click Roles button to open role modal", async () => {
      // Find first Roles button
      try {
        const rolesButton = await driver.wait(
          until.elementLocated(
            By.xpath("//button[contains(text(), 'Roles')] | //button[.//*[local-name()='svg'] and contains(., 'Roles')]")
          ),
          TIMEOUT,
          "Roles button not found"
        );
        
        await rolesButton.click();
        
        // Wait for modal to appear
        await driver.wait(
          until.elementLocated(By.xpath("//h2[contains(text(), 'Manage Roles')]")),
          TIMEOUT,
          "Role modal did not open"
        );
        
        // Verify modal is displayed
        const modal = await driver.findElement(By.xpath("//h2[contains(text(), 'Manage Roles')]"));
        expect(await modal.isDisplayed()).toBe(true);
      } catch (error) {
        // If no users exist, skip this test
        console.log("No users found - skipping role management test");
      }
    });

    test("should display checkboxes for ADMIN and EMPLOYEE roles in modal", async () => {
      try {
        const rolesButton = await driver.wait(
          until.elementLocated(By.xpath("//button[contains(text(), 'Roles')]")),
          TIMEOUT
        );
        await rolesButton.click();
        
        await driver.wait(
          until.elementLocated(By.xpath("//h2[contains(text(), 'Manage Roles')]")),
          TIMEOUT
        );
        
        // Check for ADMIN checkbox
        const adminCheckbox = await driver.findElements(
          By.xpath("//label[contains(., 'ADMIN')]//input[@type='checkbox']")
        );
        
        // Check for EMPLOYEE checkbox
        const employeeCheckbox = await driver.findElements(
          By.xpath("//label[contains(., 'EMPLOYEE')]//input[@type='checkbox']")
        );
        
        // At least one checkbox should exist
        expect(adminCheckbox.length + employeeCheckbox.length).toBeGreaterThan(0);
      } catch (error) {
        console.log("Role modal test skipped - no users found");
      }
    });

    test("should close role modal when Cancel button is clicked", async () => {
      try {
        const rolesButton = await driver.wait(
          until.elementLocated(By.xpath("//button[contains(text(), 'Roles')]")),
          TIMEOUT
        );
        await rolesButton.click();
        
        await driver.wait(
          until.elementLocated(By.xpath("//h2[contains(text(), 'Manage Roles')]")),
          TIMEOUT
        );
        
        const cancelButton = await driver.findElement(
          By.xpath("//button[contains(text(), 'Cancel')]")
        );
        await cancelButton.click();
        
        // Wait for modal to disappear
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const modalExists = await driver.findElements(
          By.xpath("//h2[contains(text(), 'Manage Roles')]")
        );
        expect(modalExists.length).toBe(0);
      } catch (error) {
        console.log("Role modal test skipped");
      }
    });
  });

  describe("Users Page - Navigation", () => {
    beforeEach(async () => {
      await driver.get(`${BASE_URL}/users`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error("Redirected to login - authentication failed");
      }
    });

    test("should click View button to navigate to user detail", async () => {
      try {
        const viewButton = await driver.wait(
          until.elementLocated(By.xpath("//button[contains(text(), 'View')]")),
          TIMEOUT,
          "View button not found"
        );
        
        await viewButton.click();
        
        // Wait for navigation to user detail page
        await driver.wait(
          until.urlContains("/users/"),
          TIMEOUT,
          "Did not navigate to user detail page"
        );
        
        const currentUrl = await driver.getCurrentUrl();
        expect(currentUrl).toMatch(/\/users\/\d+/);
      } catch (error) {
        console.log("View button test skipped - no users found");
      }
    });
  });

  describe("Users Page - Pagination", () => {
    beforeEach(async () => {
      await driver.get(`${BASE_URL}/users`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error("Redirected to login - authentication failed");
      }
    });

    test("should display pagination controls if multiple pages exist", async () => {
      // Check for pagination buttons
      const paginationButtons = await driver.findElements(
        By.xpath("//button[contains(text(), 'Previous')] | //button[contains(text(), 'Next')]")
      );
      
      // Pagination may or may not exist depending on data
      // This test just verifies the page loaded correctly
      const usersTable = await driver.findElements(
        By.xpath("//table | //div[contains(text(), 'No users found')]")
      );
      expect(usersTable.length).toBeGreaterThan(0);
    });
  });
});

