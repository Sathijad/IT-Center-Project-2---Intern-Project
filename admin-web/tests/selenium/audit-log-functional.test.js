// Audit Log Functional Tests - ADMIN ONLY
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { authenticateAsAdmin } = require("./helpers/auth-helper");
const { authenticateAsAdminWithRealLogin } = require("./helpers/real-login-helper");

// Choose authentication method:
// - Use real login (REAL_LOGIN=true): Performs actual Cognito login, requires credentials
// - Use mock tokens (default): Fast, uses mock tokens (requires mock server)
const USE_REAL_LOGIN = process.env.REAL_LOGIN === "true" || process.env.USE_REAL_LOGIN === "true";

let chromedriverPath;
try {
  const chromedriver = require("chromedriver");
  chromedriverPath = chromedriver.path;
} catch (error) {
  console.log("chromedriver package not found, using system default");
}

describe("Audit Log Functional Tests (ADMIN)", () => {
  let driver;
  const BASE_URL = process.env.WEB_BASE_URL || "http://localhost:5173";
  const TIMEOUT = 15000;

  beforeAll(async () => {
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
    const { ensureGlobalLogin } = require("./helpers/global-login");
    if (!global.__SELENIUM_LOGIN_DONE__) {
      await ensureGlobalLogin(driver, BASE_URL);
      global.__SELENIUM_LOGIN_DONE__ = true;
    }
  }, 180000); // Increased timeout for login

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  describe("Audit Log Page", () => {
    beforeEach(async () => {
      // Just navigate to page - we're already logged in from beforeAll
      const { navigateToPage } = require("./helpers/global-login");
      await navigateToPage(driver, BASE_URL, "/audit");
    });

    test("should display Audit Log header", async () => {
      const header = await driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Audit Log')]")),
        TIMEOUT,
        "Audit Log header not found"
      );
      expect(await header.isDisplayed()).toBe(true);
    });

    test("should display audit log table or empty state", async () => {
      await driver.wait(
        until.elementLocated(
          By.xpath("//table | //div[contains(text(), 'No audit log entries')] | //div[@class='animate-spin']")
        ),
        TIMEOUT,
        "Audit log table not found"
      );
    });
  });
});

