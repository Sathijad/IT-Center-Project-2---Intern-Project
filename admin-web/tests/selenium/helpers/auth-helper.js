// Authentication helper for Selenium tests
// Provides functions to set admin or employee tokens

const { By } = require("selenium-webdriver");

/**
 * Sets admin user tokens in localStorage
 * @param {WebDriver} driver - Selenium WebDriver instance
 */
async function setAdminTokens(driver) {
  await driver.executeScript(`
    localStorage.setItem('access_token', 'mock-admin-token-for-testing');
    localStorage.setItem('id_token', 'mock-admin-id-token');
    localStorage.setItem('refresh_token', 'mock-admin-refresh-token');
    localStorage.setItem('expires_at', '${Date.now() + 3600000}');
    
    // Mock user data in sessionStorage for admin
    sessionStorage.setItem('mock_user', JSON.stringify({
      id: 1,
      email: 'admin@itcenter.com',
      displayName: 'Admin User',
      roles: ['ADMIN', 'EMPLOYEE'],
      locale: 'en-GB',
      lastLogin: new Date().toISOString()
    }));
  `);
}

/**
 * Sets employee user tokens in localStorage
 * @param {WebDriver} driver - Selenium WebDriver instance
 */
async function setEmployeeTokens(driver) {
  await driver.executeScript(`
    localStorage.setItem('access_token', 'mock-employee-token-for-testing');
    localStorage.setItem('id_token', 'mock-employee-id-token');
    localStorage.setItem('refresh_token', 'mock-employee-refresh-token');
    localStorage.setItem('expires_at', '${Date.now() + 3600000}');
    
    // Mock user data in sessionStorage for employee
    sessionStorage.setItem('mock_user', JSON.stringify({
      id: 2,
      email: 'employee@itcenter.com',
      displayName: 'Employee User',
      roles: ['EMPLOYEE'],
      locale: 'en-GB',
      lastLogin: new Date().toISOString()
    }));
  `);
}

/**
 * Authenticates as admin and navigates to a page
 * @param {WebDriver} driver - Selenium WebDriver instance
 * @param {string} baseUrl - Base URL of the application
 * @param {string} targetUrl - URL to navigate to after authentication
 */
async function authenticateAsAdmin(driver, baseUrl, targetUrl = '/') {
  const { until } = require("selenium-webdriver");
  
  // Navigate to login page and set tokens
  await driver.get(`${baseUrl}/login`);
  
  // Set tokens in localStorage
  // If mock server is running, /api/v1/me will return admin user from mock server
  // If mock server is not running, API calls will fail and pages won't load
  await driver.executeScript(`
    localStorage.setItem('access_token', 'mock-admin-token-for-testing');
    localStorage.setItem('id_token', 'mock-admin-id-token');
    localStorage.setItem('refresh_token', 'mock-admin-refresh-token');
    localStorage.setItem('expires_at', '${Date.now() + 3600000}');
  `);
  
  // Wait for tokens to be set
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Navigate to target URL
  // If mock server is running, API calls will go to mock server and return admin user
  // If not, pages will show loading/error states
  await driver.get(`${baseUrl}${targetUrl}`);
  
  // Wait for loading spinner to disappear (ProtectedRoute loading state)
  // This indicates AuthContext finished loading user data
  try {
    await driver.wait(
      async () => {
        const loadingSpinners = await driver.findElements(
          By.xpath("//div[contains(@class, 'animate-spin')] | //div[@class='animate-spin']")
        );
        // Check if any loading spinner is visible
        if (loadingSpinners.length === 0) return true;
        
        // Check if spinners are visible (some might be hidden)
        for (const spinner of loadingSpinners) {
          try {
            const isDisplayed = await spinner.isDisplayed();
            if (isDisplayed) return false;
          } catch (e) {
            // Element might be removed from DOM
          }
        }
        return true;
      },
      15000, // 15 seconds max wait for loading
      "Loading spinner did not disappear - AuthContext may not have loaded user data"
    );
  } catch (e) {
    // Loading spinner might have disappeared already, continue
    console.log("Note: Could not wait for loading spinner to disappear, continuing...");
  }
  
  // Additional wait for API call to complete (AuthContext /api/v1/me call)
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check for error states
  const currentUrl = await driver.getCurrentUrl();
  
  // Check for 403 Forbidden page (means user is not ADMIN)
  const forbiddenText = await driver.findElements(
    By.xpath("//h1[contains(text(), '403')] | //h1[contains(text(), 'Forbidden')] | //p[contains(text(), 'permission')] | //p[contains(text(), 'do not have permission')]")
  );
  if (forbiddenText.length > 0) {
    let forbiddenMessage = "403 Forbidden";
    try {
      forbiddenMessage = await forbiddenText[0].getText();
    } catch (e) {
      // Ignore text extraction errors
    }
    throw new Error(
      "Got 403 Forbidden: " + forbiddenMessage + 
      "\nThis means user role is not set as ADMIN." +
      "\n\nSOLUTION:" +
      "\n1. Start mock server: npm run e2e:api" +
      "\n2. Start frontend with mock server: npm run e2e:web" +
      "\n3. Then run tests: npm run selenium:test" +
      "\n\nOR if using AWS backend:" +
      "\n- Ensure frontend is configured to use AWS backend" +
      "\n- Ensure valid AWS Cognito tokens are set"
    );
  }
  
  if (currentUrl.includes('/login')) {
    throw new Error(
      "Redirected to login - authentication failed. " +
      "The /api/v1/me endpoint may not be available or tokens are invalid." +
      "\n\nSOLUTION:" +
      "\n- For local testing: Start mock server (npm run e2e:api) and use frontend with mock server (npm run e2e:web)" +
      "\n- For AWS testing: Ensure valid AWS Cognito tokens and backend is accessible"
    );
  }
  
  // Verify we're on the target page (not stuck on loading/error)
  // Wait a bit more to ensure page content is rendered
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Authenticates as employee and navigates to a page
 * @param {WebDriver} driver - Selenium WebDriver instance
 * @param {string} baseUrl - Base URL of the application
 * @param {string} targetUrl - URL to navigate to after authentication
 */
async function authenticateAsEmployee(driver, baseUrl, targetUrl = '/') {
  await driver.get(`${baseUrl}/login`);
  await driver.executeScript(`
    localStorage.setItem('access_token', 'mock-employee-token-for-testing');
    localStorage.setItem('id_token', 'mock-employee-id-token');
    localStorage.setItem('refresh_token', 'mock-employee-refresh-token');
    localStorage.setItem('expires_at', '${Date.now() + 3600000}');
  `);
  
  // Wait for React to process token
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Navigate to target URL
  await driver.get(`${baseUrl}${targetUrl}`);
  
  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Waits for page loading to complete (spinners disappear)
 * Useful for pages that show loading state while fetching data
 * @param {WebDriver} driver - Selenium WebDriver instance
 * @param {number} timeout - Maximum wait time in milliseconds (default: 20000)
 */
async function waitForPageLoad(driver, timeout = 20000) {
  const { until } = require("selenium-webdriver");
  
  try {
    await driver.wait(
      async () => {
        // Find all loading spinners
        const loadingSpinners = await driver.findElements(
          By.xpath("//div[contains(@class, 'animate-spin')] | //div[@class='animate-spin'] | //div[contains(@class, 'spinner')]")
        );
        
        // If no spinners found, page is loaded
        if (loadingSpinners.length === 0) return true;
        
        // Check if any spinner is visible
        for (const spinner of loadingSpinners) {
          try {
            const isDisplayed = await spinner.isDisplayed();
            if (isDisplayed) return false;
          } catch (e) {
            // Element might be removed from DOM, ignore
          }
        }
        
        // All spinners are hidden
        return true;
      },
      timeout,
      "Page did not finish loading - loading spinner still visible"
    );
  } catch (e) {
    // Loading spinner might have disappeared already, or timeout occurred
    // Continue - page might be loaded or showing error state
    console.log("Note: Could not verify loading spinner disappeared, continuing...");
  }
  
  // Small additional wait for React to render content
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Checks if page is showing an error state
 * @param {WebDriver} driver - Selenium WebDriver instance
 * @returns {Promise<boolean>} True if error is found, false otherwise
 */
async function isPageShowingError(driver) {
  try {
    const errorElements = await driver.findElements(
      By.xpath(
        "//*[contains(text(), 'Error')] | " +
        "//*[contains(text(), 'error')] | " +
        "//*[contains(text(), 'Failed')] | " +
        "//*[contains(@class, 'error')] | " +
        "//div[contains(@class, 'bg-red-50')]"
      )
    );
    
    for (const element of errorElements) {
      try {
        if (await element.isDisplayed()) {
          return true;
        }
      } catch (e) {
        // Ignore
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

module.exports = {
  setAdminTokens,
  setEmployeeTokens,
  authenticateAsAdmin,
  authenticateAsEmployee,
  waitForPageLoad,
  isPageShowingError,
};

