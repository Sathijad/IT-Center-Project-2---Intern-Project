import { Builder, WebDriver, until, By } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import chromedriver from 'chromedriver';

export const getBaseUrl = (): string => {
  return process.env.WEB_BASE_URL || 'http://localhost:5173';
};

/**
 * Create WebDriver with optimized timeouts for E2E testing
 * Uses explicit waits (implicit wait = 0) to avoid flakiness
 */
export const createDriver = async (): Promise<WebDriver> => {
  const options = new chrome.Options();
  
  // Run headless by default unless HEADFUL=true
  if (process.env.HEADFUL !== 'true') {
    // Use new headless for modern Chrome
    options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu');
  }
  
  options.addArguments('--window-size=1920,1080');
  options.setPageLoadStrategy('eager'); // Don't wait for full page load
  
  // Explicitly pin to npm chromedriver matching local Chrome
  const serviceBuilder = new chrome.ServiceBuilder(chromedriver.path);
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .setChromeService(serviceBuilder)
    .build();

  // Set timeouts: use explicit waits, more reliable
  await driver.manage().setTimeouts({
    implicit: 0,           // Use explicit waits, not implicit
    pageLoad: 60000,      // 60s for slow dev servers
    script: 60000
  });

  return driver;
};

export const setAuthToken = async (driver: WebDriver, token: string): Promise<void> => {
  await driver.executeScript(
    `localStorage.setItem('access_token', arguments[0]);`,
    token
  );
};

export const waitForPageLoad = async (driver: WebDriver): Promise<void> => {
  await driver.wait(async () => {
    const state = await driver.executeScript('return document.readyState');
    return state === 'complete';
  }, 60000); // Increased timeout for slow dev servers
};

/**
 * Strong explicit wait for element - uses Selenium's built-in until.elementLocated
 * More reliable than custom polling
 */
export const waitForElement = async (
  driver: WebDriver,
  locator: By,
  timeout: number = 30000
): Promise<any> => {
  return await driver.wait(until.elementLocated(locator), timeout);
};

/**
 * Wait for element to be visible (located AND displayed)
 */
export const waitForElementVisible = async (
  driver: WebDriver,
  locator: By,
  timeout: number = 30000
): Promise<any> => {
  const element = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(element), timeout);
  return element;
};

/**
 * Seed authentication token before app loads
 * This ensures AuthContext can authenticate via /api/v1/me
 */
export const seedAuthToken = async (driver: WebDriver, token: string = 'e2e-token'): Promise<void> => {
  // Navigate to login page first to access localStorage
  const baseUrl = getBaseUrl();
  await driver.get(`${baseUrl}/login`);
  
  // Set token in localStorage BEFORE app loads
  await driver.executeScript(`
    localStorage.setItem('access_token', '${token}');
    localStorage.setItem('id_token', 'test-id-token');
  `);
  
  console.log('Auth token seeded in localStorage');
};

/**
 * Update user roles in mock data (for testing role changes)
 */
export const updateMockUserRoles = async (
  driver: WebDriver, 
  userEmail: string, 
  roles: string[]
): Promise<void> => {
  await driver.executeScript(`
    const email = arguments[0];
    const roles = arguments[1];
    const user = window.__mockData.users.content.find(u => u.email === email);
    if (user) {
      user.roles = roles;
    }
  `, userEmail, roles);
};

