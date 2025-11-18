// Global Login Helper - Login once, reuse for all tests
// This ensures we login only ONCE at the beginning, then reuse the session

const { authenticateAsAdminWithRealLogin } = require('./real-login-helper');
const { authenticateAsAdmin } = require('./auth-helper');

let globalLoginDone = false;
let globalDriver = null;
let globalLoginPromise = null; // Track login promise to avoid duplicate logins

/**
 * Performs global login once, then reuses session for all tests
 * @param {WebDriver} driver - Selenium WebDriver instance
 * @param {string} baseUrl - Base URL of the application
 */
async function ensureGlobalLogin(driver, baseUrl) {
  // Store driver globally
  globalDriver = driver;
  
  // If already logged in, skip
  if (globalLoginDone) {
    console.log("✅ Using existing login session...");
    return true;
  }
  
  // If login is in progress, wait for it
  if (globalLoginPromise) {
    console.log("⏳ Login in progress, waiting...");
    await globalLoginPromise;
    return true;
  }
  
  const USE_REAL_LOGIN = process.env.REAL_LOGIN === "true" || process.env.USE_REAL_LOGIN === "true";
  
  // Create login promise to prevent duplicate logins
  globalLoginPromise = (async () => {
    if (USE_REAL_LOGIN) {
      console.log("\n🔐 Performing GLOBAL login (once for all tests)...");
      console.log("   This will login once, then all tests will reuse this session.\n");
      console.log("   You will need to enter verification code ONCE, then all tests continue.\n");
      
      const credentials = {
        email: process.env.ADMIN_EMAIL || process.env.TEST_ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD,
      };
      
      if (!credentials.email || !credentials.password) {
        throw new Error(
          "Admin credentials are required for real login.\n" +
          "Set environment variables: ADMIN_EMAIL and ADMIN_PASSWORD"
        );
      }
      
      // Login once
      await authenticateAsAdminWithRealLogin(driver, baseUrl, '/', credentials, 120000);
      globalLoginDone = true;
      console.log("\n✅ Global login complete! All tests will now reuse this session.\n");
    } else {
      console.log("Using MOCK tokens (fast mode)...");
      // For mock tokens, just set them once
      await authenticateAsAdmin(driver, baseUrl, '/');
      globalLoginDone = true;
    }
  })();
  
  // Wait for login to complete
  await globalLoginPromise;
  globalLoginPromise = null; // Clear promise after completion
  
  return true;
}

/**
 * Navigate to a page (assumes already logged in)
 * @param {WebDriver} driver - Selenium WebDriver instance
 * @param {string} baseUrl - Base URL
 * @param {string} targetUrl - URL to navigate to
 */
async function navigateToPage(driver, baseUrl, targetUrl) {
  // Just navigate - we're already logged in
  await driver.get(`${baseUrl}${targetUrl}`);
  
  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Wait for loading to finish
  const { waitForPageLoad } = require('./auth-helper');
  await waitForPageLoad(driver, 20000);
}

module.exports = {
  ensureGlobalLogin,
  navigateToPage,
};

