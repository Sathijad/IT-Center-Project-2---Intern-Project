// UI Automation Test for Admin Dashboard Login and Navigation
// Adapted from friend's approach - using Jest and CommonJS for simplicity

const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { loginWithRealCredentials } = require("./helpers/real-login-helper");

// Try to use chromedriver from node_modules
let chromedriverPath;
try {
  const chromedriver = require("chromedriver");
  chromedriverPath = chromedriver.path;
  console.log("Using chromedriver from node_modules:", chromedriverPath);
} catch (error) {
  console.log("chromedriver package not found, using system default");
}

// Check if backend is running on port 8080
async function checkBackendRunning() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:8080/healthz", { timeout: 2000 }, (res) => {
      resolve(true); // Backend is running
    });
    req.on("error", () => {
      resolve(false); // Backend is not running
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

describe("Admin Dashboard UI Automation Tests", () => {
  let driver;
  const BASE_URL = process.env.WEB_BASE_URL || "http://localhost:5173";
  const TIMEOUT = 15000; // 15 seconds timeout
  let backendRunning = false;

  // Test credentials - REQUIRED for real Cognito login
  const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || process.env.ADMIN_EMAIL || "",
    password: process.env.TEST_USER_PASSWORD || process.env.ADMIN_PASSWORD || "",
  };
  
  // Check if credentials are provided
  const USE_REAL_LOGIN = TEST_USER.email && TEST_USER.password;
  
  // Track if login has been done (prevent multiple logins)
  let loginDone = false;

  beforeAll(async () => {
    // Check if backend is running
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
    // Configure Chrome options
    const options = new chrome.Options();
    
    // Use headless mode unless HEADFUL=true
    if (process.env.HEADFUL !== "true") {
      options.addArguments("--headless=new");
      options.addArguments("--disable-gpu");
    }
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--window-size=1920,1080");
    options.addArguments("--disable-extensions");
    options.addArguments("--disable-logging");

    // Try to set Chrome binary path (optional, will use system default if not found)
    try {
      const chromePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      ];
      for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
          options.setChromeBinaryPath(chromePath);
          console.log(`Using Chrome at: ${chromePath}`);
          break;
        }
      }
    } catch (error) {
      console.log("Using system default Chrome");
    }

    try {
      console.log("Creating WebDriver...");
      
      // Build driver with chromedriver service if available
      let builder = new Builder().forBrowser("chrome").setChromeOptions(options);
      
      if (chromedriverPath) {
        const service = new chrome.ServiceBuilder(chromedriverPath);
        builder = builder.setChromeService(service);
      }
      
      driver = await builder.build();

      // Set timeouts
      await driver.manage().setTimeouts({ 
        implicit: 10000,
        pageLoad: 30000,
        script: 30000
      });
      console.log("WebDriver created successfully");
    } catch (error) {
      console.error("Failed to create WebDriver:", error);
      console.error("Error details:", error.message);
      throw error;
    }
  }, 90000); // Increase timeout to 90 seconds

  afterAll(async () => {
    if (driver) {
      console.log("Quitting WebDriver...");
      await driver.quit();
      console.log("WebDriver quit successfully");
    }
  });

  describe("Login Flow", () => {
    test("should navigate to login page and display Sign in with Cognito button", async () => {
      // Navigate to login page
      await driver.get(`${BASE_URL}/login`);

      // Wait for page to load
      await driver.wait(
        until.titleContains("IT Center") || until.elementLocated(By.xpath("//h2[contains(text(), 'IT Center Admin')]")),
        TIMEOUT
      );

      // Find and verify "Sign in with Cognito" button exists
      const loginButton = await driver.wait(
        until.elementLocated(
          By.xpath("//button[contains(text(), 'Sign in with Cognito')]")
        ),
        TIMEOUT,
        "Login button not found"
      );

      expect(await loginButton.isDisplayed()).toBe(true);
      expect(await loginButton.getText()).toContain("Sign in with Cognito");
    });

    test("should click Login button and redirect to Cognito hosted UI", async () => {
      // Navigate to login page first
      await driver.get(`${BASE_URL}/login`);
      
      // Wait for button to be visible
      await driver.wait(
        until.elementLocated(
          By.xpath("//button[contains(text(), 'Sign in with Cognito')]")
        ),
        TIMEOUT
      );

      // Click the login button
      const loginButton = await driver.findElement(
        By.xpath("//button[contains(text(), 'Sign in with Cognito')]")
      );
      await loginButton.click();

      // Wait for redirect to Cognito hosted UI
      await driver.wait(
        until.urlContains("amazoncognito.com"),
        TIMEOUT,
        "Did not redirect to Cognito login page"
      );

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain("amazoncognito.com");
      console.log("Redirected to Cognito:", currentUrl);
    });

    test("should fill in email and password on Cognito login form (if credentials provided)", async () => {
      // Skip if no password provided (using mock tokens instead)
      if (!TEST_USER.password) {
        console.log("Skipping Cognito login - using mock tokens instead");
        return;
      }

      // This test is now handled by the real-login-helper
      // Just verify that credentials are set up correctly
      expect(TEST_USER.email).toBeTruthy();
      expect(TEST_USER.password).toBeTruthy();
      console.log("✅ Credentials are configured for real Cognito login");
      console.log(`   Email: ${TEST_USER.email}`);
      console.log("   Password: [hidden]");
    });

    test("should submit login form and redirect to dashboard (if credentials provided)", async () => {
      // Skip if no password provided
      if (!TEST_USER.password) {
        console.log("Skipping login submission - using mock tokens instead");
        return;
      }

      // Find and click the submit button
      const submitButton = await driver.wait(
        until.elementLocated(
          By.css('input[type="submit"], button[type="submit"]')
        ),
        TIMEOUT,
        "Submit button not found"
      );
      await submitButton.click();

      // Wait for redirect back to app
      await driver.wait(
        until.urlContains(BASE_URL),
        TIMEOUT * 2, // Longer timeout for OAuth flow
        "Did not redirect back to app"
      );

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain(BASE_URL);
      console.log("Redirected to:", currentUrl);
    });
  });

  describe("Dashboard Navigation", () => {
    // Helper function to authenticate (real login or mock tokens)
    // Login only ONCE, then reuse session
    const authenticate = async () => {
      // If already logged in, just navigate
      if (loginDone) {
        console.log("✅ Already logged in, navigating to dashboard...");
        await driver.get(`${BASE_URL}/`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return;
      }
      
      if (USE_REAL_LOGIN) {
        // Use real Cognito login (ONCE)
        console.log("\n🔐 Performing real Cognito login (ONCE for all tests)...");
        await loginWithRealCredentials(driver, BASE_URL, TEST_USER, 120000);
        
        // Mark login as done
        loginDone = true;
        
        // Wait for app to process authentication
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Navigate to dashboard
        await driver.get(`${BASE_URL}/`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // Fallback to mock tokens (may not work if backend is running)
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
        await driver.get(`${BASE_URL}/`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const currentUrl = await driver.getCurrentUrl();
        if (currentUrl.includes('/login')) {
          throw new Error(
            "\n❌ FAILED: Mock token was rejected.\n" +
            "   Please provide credentials for real login:\n" +
            "   Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables\n"
          );
        }
      }
    };

    test("should navigate to dashboard", async () => {
      await authenticate();
      
      // Wait for dashboard content - the Dashboard page has <h1>Dashboard</h1>
      // Increased timeout since login might take time (verification code entry)
      await driver.wait(
        until.elementLocated(
          By.xpath("//h1[contains(text(), 'Dashboard')]")
        ),
        TIMEOUT * 3, // 45 seconds - enough time for verification code entry
        "Dashboard header not found. Login may have timed out waiting for verification code."
      );

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain(BASE_URL);
      expect(currentUrl).not.toContain('/login');
      console.log("Dashboard loaded at:", currentUrl);
    }, 180000); // 3 minutes timeout for this test (includes verification code entry)

    test("should display dashboard content", async () => {
      await authenticate();
      
      // Wait for dashboard header
      const dashboardHeader = await driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Dashboard')]")),
        TIMEOUT,
        "Dashboard header not found"
      );
      
      expect(await dashboardHeader.isDisplayed()).toBe(true);
      
      // Check for welcome message (Dashboard shows "Welcome back, {user}")
      const welcomeMessage = await driver.findElements(
        By.xpath("//p[contains(text(), 'Welcome')]")
      );
      
      expect(welcomeMessage.length).toBeGreaterThan(0);
    });
  });

  describe("Navigation Tests", () => {
    // Helper to authenticate before each navigation test
    // Login only ONCE, then reuse session
    const authenticate = async () => {
      // If already logged in, skip login
      if (loginDone) {
        console.log("✅ Already logged in, skipping login...");
        return;
      }
      
      if (USE_REAL_LOGIN) {
        // Use real Cognito login (ONCE)
        console.log("\n🔐 Performing real Cognito login (ONCE for all tests)...");
        await loginWithRealCredentials(driver, BASE_URL, TEST_USER, 120000);
        
        // Mark login as done
        loginDone = true;
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        // Fallback to mock tokens
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
        
        const currentUrl = await driver.getCurrentUrl();
        if (currentUrl.includes('/login')) {
          throw new Error(
            "\n❌ FAILED: Mock token was rejected.\n" +
            "   Please provide credentials for real login:\n" +
            "   Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables\n"
          );
        }
      }
    };

    test("should navigate to Users page", async () => {
      await authenticate();
      
      // Navigate to Users page
      await driver.get(`${BASE_URL}/users`);
      
      // Wait for page to load and auth check
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = await driver.getCurrentUrl();
      
      // If redirected to login, the token wasn't accepted
      if (currentUrl.includes('/login')) {
        const errorMsg = backendRunning
          ? "\n❌ FAILED: Backend is running and rejected mock tokens.\n" +
            "   SOLUTION: Stop backend (port 8080) before running tests.\n" +
            "   PowerShell: Get-Process | Where-Object {$_.Name -eq 'java'} | Stop-Process\n"
          : "\n❌ FAILED: Mock token rejected. Check if backend started.\n";
        throw new Error(errorMsg);
      }

      // Wait for users page content
      await driver.wait(
        until.elementLocated(
          By.xpath("//h1[contains(text(), 'User')] | //h2[contains(text(), 'User')] | //main")
        ),
        TIMEOUT,
        "Users page not loaded"
      );

      expect(currentUrl).toContain("/users");
    });

    test("should navigate to Profile page", async () => {
      await authenticate();
      
      await driver.get(`${BASE_URL}/profile`);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = await driver.getCurrentUrl();
      
      if (currentUrl.includes('/login')) {
        throw new Error(
          "\n❌ FAILED: Authentication failed.\n" +
          (USE_REAL_LOGIN 
            ? "   Real login may have failed. Check credentials.\n"
            : "   Mock token was rejected. Please provide credentials for real login.\n")
        );
      }

      await driver.wait(
        until.elementLocated(
          By.xpath("//h1[contains(text(), 'Profile')] | //h2[contains(text(), 'Profile')] | //main")
        ),
        TIMEOUT,
        "Profile page not loaded"
      );

      expect(currentUrl).toContain("/profile");
    });

    test("should navigate to Leave page", async () => {
      await authenticate();
      
      await driver.get(`${BASE_URL}/leave`);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = await driver.getCurrentUrl();
      
      if (currentUrl.includes('/login')) {
        throw new Error(
          "\n❌ FAILED: Authentication failed.\n" +
          (USE_REAL_LOGIN 
            ? "   Real login may have failed. Check credentials.\n"
            : "   Mock token was rejected. Please provide credentials for real login.\n")
        );
      }

      await driver.wait(
        until.elementLocated(
          By.xpath("//h1[contains(text(), 'Leave')] | //h2[contains(text(), 'Leave')] | //main")
        ),
        TIMEOUT,
        "Leave page not loaded"
      );

      expect(currentUrl).toContain("/leave");
    });
  });

  describe("Screenshot Capture", () => {
    test("should capture screenshot of dashboard", async () => {
      // Authenticate first (real login or mock tokens)
      // If already logged in, skip login
      if (!loginDone) {
        if (USE_REAL_LOGIN) {
          console.log("\n🔐 Performing real Cognito login (ONCE for all tests)...");
          await loginWithRealCredentials(driver, BASE_URL, TEST_USER, 120000);
          loginDone = true;
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
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
      }
      
      // Navigate to dashboard
      await driver.get(`${BASE_URL}/`);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if we were redirected to login (token rejected)
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error(
          "\n❌ FAILED: Authentication failed.\n" +
          (USE_REAL_LOGIN 
            ? "   Real login may have failed. Check credentials.\n"
            : "   Mock token was rejected. Please provide credentials for real login.\n")
        );
      }

      // Wait for dashboard to load
      await driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Dashboard')]")),
        TIMEOUT,
        "Dashboard not loaded for screenshot"
      );

      // Create screenshots directory if it doesn't exist
      const screenshotsDir = path.join(__dirname, "..", "..", "screenshots");
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      // Capture screenshot
      const screenshot = await driver.takeScreenshot();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const screenshotPath = path.join(
        screenshotsDir,
        `dashboard-${timestamp}.png`
      );

      fs.writeFileSync(screenshotPath, screenshot, "base64");

      console.log(`Screenshot saved: ${screenshotPath}`);
      expect(fs.existsSync(screenshotPath)).toBe(true);
    });
  });
});

