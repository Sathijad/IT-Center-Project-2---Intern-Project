// Real Cognito Login Helper for Selenium Tests
// This performs actual login flow with AWS Cognito
// User must manually enter verification code when prompted

const { By, until, Key } = require("selenium-webdriver");

/**
 * Logs in with real Cognito credentials
 * This performs the actual login flow:
 * 1. Navigates to login page
 * 2. Clicks "Sign in with Cognito" button
 * 3. Fills in email and password on Cognito hosted UI
 * 4. Waits for user to manually enter verification code
 * 5. Waits for redirect back to app
 * 6. Verifies authentication succeeded
 * 
 * @param {WebDriver} driver - Selenium WebDriver instance
 * @param {string} baseUrl - Base URL of the application
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @param {number} verificationTimeout - Max time to wait for verification code (default: 120000 = 2 minutes)
 */
async function loginWithRealCredentials(driver, baseUrl, credentials, verificationTimeout = 120000) {
  const { email, password } = credentials;
  
  if (!email || !password) {
    throw new Error("Email and password are required for real login");
  }
  
  // Check if already logged in (tokens exist and valid)
  try {
    const hasTokens = await driver.executeScript(`
      const token = localStorage.getItem('access_token');
      const expiresAt = localStorage.getItem('expires_at');
      if (!token || !expiresAt) return false;
      const now = Date.now();
      const expires = parseInt(expiresAt);
      return expires > now;
    `);
    
    if (hasTokens) {
      // Check if we're on a valid page (not login page)
      const currentUrl = await driver.getCurrentUrl();
      if (!currentUrl.includes('/login') && !currentUrl.includes('amazoncognito.com')) {
        console.log("\n✅ Already logged in! Reusing existing session...\n");
        return true; // Already authenticated, skip login
      }
    }
  } catch (e) {
    // If check fails, proceed with login
  }
  
  console.log("\n🔐 Starting real Cognito login flow...");
  console.log(`   Email: ${email}`);
  console.log(`   Note: You will need to manually enter verification code when prompted\n`);
  
  // Step 1: Navigate to login page
  console.log("Step 1: Navigating to login page...");
  await driver.get(`${baseUrl}/login`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 2: Click "Sign in with Cognito" button
  console.log("Step 2: Clicking 'Sign in with Cognito' button...");
  const loginButton = await driver.wait(
    until.elementLocated(
      By.xpath("//button[contains(text(), 'Sign in with Cognito')] | //button[contains(text(), 'Cognito')]")
    ),
    10000,
    "Login button not found"
  );
  
  // Scroll button into view and click
  await driver.executeScript("arguments[0].scrollIntoView(true);", loginButton);
  await new Promise(resolve => setTimeout(resolve, 500));
  await loginButton.click();
  
  // Wait for redirect to Cognito hosted UI
  console.log("Step 3: Waiting for Cognito hosted UI to load...");
  await driver.wait(
    async () => {
      const currentUrl = await driver.getCurrentUrl();
      return currentUrl.includes("amazoncognito.com") || currentUrl.includes("cognito");
    },
    20000,
    "Did not redirect to Cognito login page"
  );
  
  // Wait for page to fully load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 3: Fill in email and password on Cognito hosted UI
  console.log("Step 4: Filling in email and password...");
  
  // Wait for username/email input field to be visible and ready
  const emailInput = await driver.wait(
    until.elementLocated(By.name("username")),
    20000,
    "Email input field not found on Cognito page"
  );
  
  // Wait for input to be visible and enabled
  await driver.wait(until.elementIsVisible(emailInput), 10000);
  await driver.wait(until.elementIsEnabled(emailInput), 10000);
  
  // Check if email is already filled (prevent multiple entries)
  let emailValue = await emailInput.getAttribute("value").catch(() => "");
  if (emailValue && emailValue.trim() === email.trim()) {
    console.log("Email already filled, skipping...");
  } else {
    // Clear and fill email
    console.log("Filling email field...");
    await emailInput.clear();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Type email character by character (more reliable)
    for (const char of email) {
      await emailInput.sendKeys(char);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify email was entered
    emailValue = await emailInput.getAttribute("value");
    if (!emailValue || emailValue.trim() !== email.trim()) {
      console.log("Email value mismatch, retrying...");
      await emailInput.clear();
      await new Promise(resolve => setTimeout(resolve, 500));
      for (const char of email) {
        await emailInput.sendKeys(char);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log("✅ Email entered successfully");
  }
  
  console.log("Email entered successfully. Looking for password field...");
  
  // Wait a moment for Cognito to process the email
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check for "Next" button first - some Cognito forms require clicking Next after email
  let nextButtonClicked = false;
  try {
    console.log("Checking for 'Next' button...");
    const nextButtonSelectors = [
      By.xpath("//button[contains(text(), 'Next')]"),
      By.xpath("//button[contains(text(), 'next')]"),
      By.xpath("//input[@value='Next']"),
      By.xpath("//input[@value='next']"),
      By.xpath("//button[contains(text(), 'Continue')]"),
      By.xpath("//button[@type='submit']"),
      By.css('button[type="submit"]'),
      By.css('input[type="submit"]'),
    ];
    
    for (const selector of nextButtonSelectors) {
      try {
        const buttons = await driver.findElements(selector);
        for (const btn of buttons) {
          try {
            const isDisplayed = await btn.isDisplayed();
            const isEnabled = await btn.isEnabled();
            if (isDisplayed && isEnabled) {
              const btnText = await btn.getText().catch(() => "");
              const btnValue = await btn.getAttribute("value").catch(() => "");
              console.log(`Found button: "${btnText || btnValue}", clicking...`);
              
              // Scroll into view
              await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", btn);
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Try multiple click methods
              try {
                // Method 1: JavaScript click
                await driver.executeScript("arguments[0].click();", btn);
                console.log("   Clicked using JavaScript");
              } catch (e1) {
                try {
                  // Method 2: Normal click
                  await btn.click();
                  console.log("   Clicked using normal click");
                } catch (e2) {
                  // Method 3: Mouse events
                  await driver.executeScript(`
                    var btn = arguments[0];
                    var event = new MouseEvent('click', {
                      view: window,
                      bubbles: true,
                      cancelable: true
                    });
                    btn.dispatchEvent(event);
                  `, btn);
                  console.log("   Clicked using MouseEvent");
                }
              }
              
              nextButtonClicked = true;
              console.log("✅ 'Next' button clicked! Waiting for form to transition...");
              
              // Wait for form to change - check if password field appears or page changes
              const urlBeforeClick = await driver.getCurrentUrl();
              let detectedPasswordField = null;
              let formChanged = false;
              
              for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if password field appeared
                try {
                  const passwordFields = await driver.findElements(By.xpath("//input[@type='password']"));
                  for (const field of passwordFields) {
                    try {
                      const isVisible = await field.isDisplayed().catch(() => false);
                      const isEnabled = await field.isEnabled().catch(() => false);
                      if (isVisible && isEnabled) {
                        detectedPasswordField = field;
                        formChanged = true;
                        console.log(`   ✅ Form changed! Password field appeared after ${i + 1} seconds`);
                        break;
                      }
                    } catch (e) {
                      // Try next field
                    }
                  }
                  if (detectedPasswordField) break;
                } catch (e) {
                  // Continue waiting
                }
                
                // Check if URL changed
                const currentUrl = await driver.getCurrentUrl();
                if (currentUrl !== urlBeforeClick) {
                  formChanged = true;
                  console.log(`   ✅ Form changed! URL changed after ${i + 1} seconds`);
                  break;
                }
              }
              
              if (!formChanged) {
                console.log("   ⚠️  Form may not have changed yet, continuing to look for password field...");
              }
              
              // If we detected the password field, store it to use later
              if (detectedPasswordField) {
                // Store in a way we can retrieve it
                await driver.executeScript(`
                  window.__DETECTED_PASSWORD_FIELD__ = true;
                `);
              }
              
              break;
            }
          } catch (e) {
            // Try next button
          }
        }
        if (nextButtonClicked) break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!nextButtonClicked) {
      console.log("No 'Next' button found - password field should be on same page");
      // Try pressing Enter on email field as alternative
      await emailInput.sendKeys(Key.ENTER);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (e) {
    console.log("Error checking for Next button:", e.message);
  }
  
  // Wait for password field to appear (might take time after email is entered or Next clicked)
  console.log("Waiting for password field to appear...");
  console.log("   (This may take a few seconds - Cognito validates email first)");
  
  // Additional wait after Next button click or Enter key
  if (nextButtonClicked) {
    console.log("   Waiting for form to transition after Next button click...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced wait since we already waited in the loop
  }
  
  // First, try to find password field that we might have already detected
  let passwordInput = null;
  try {
    const passwordFields = await driver.findElements(By.xpath("//input[@type='password']"));
    for (const field of passwordFields) {
      try {
        const isDisplayed = await field.isDisplayed().catch(() => false);
        const isEnabled = await field.isEnabled().catch(() => false);
        if (isDisplayed && isEnabled) {
          passwordInput = field;
          console.log("   ✅ Password field found immediately!");
          break;
        }
      } catch (e) {
        // Try next field
      }
    }
  } catch (e) {
    // Continue to wait function
  }
  
  // If not found immediately, wait for it
  if (!passwordInput) {
    passwordInput = await driver.wait(
    async () => {
      try {
        // Try multiple selectors for password field
        const passwordSelectors = [
          By.name("password"),
          By.id("password"),
          By.xpath("//input[@type='password']"),
          By.xpath("//input[@name='password']"),
          By.css('input[type="password"]'),
          By.xpath("//input[contains(@placeholder, 'password')]"),
          By.xpath("//input[contains(@placeholder, 'Password')]"),
          By.xpath("//input[@autocomplete='current-password']"),
          By.xpath("//input[@autocomplete='password']"),
        ];
        
        for (const selector of passwordSelectors) {
          try {
            const elements = await driver.findElements(selector);
            for (const element of elements) {
              try {
                const isDisplayed = await element.isDisplayed();
                const isEnabled = await element.isEnabled();
                if (isDisplayed && isEnabled) {
                  // Double check it's actually visible in viewport
                  const location = await element.getLocation();
                  const size = await element.getSize();
                  if (location.y >= 0 && size.height > 0) {
                    console.log("   ✅ Password field found!");
                    return element;
                  }
                }
              } catch (e) {
                // Element might not be accessible yet
              }
            }
          } catch (e) {
            // Try next selector
          }
        }
        
        // Debug: Check current page state
        try {
          const currentUrl = await driver.getCurrentUrl();
          const pageText = await driver.findElement(By.tagName("body")).getText().catch(() => "");
          
          // Check if we're still on login page or moved to password page
          if (currentUrl.includes("cognito") && !currentUrl.includes("error")) {
            // Still on Cognito, check what's on the page
            if (pageText.includes("password") || pageText.includes("Password")) {
              console.log("   Page mentions 'password' but field not found yet...");
            } else if (pageText.includes("email") || pageText.includes("Email")) {
              console.log("   Still on email page, waiting for transition...");
            }
          }
        } catch (e) {
          // Ignore debug errors
        }
        
        return null;
      } catch (e) {
        return null;
      }
    },
      30000, // Wait up to 30 seconds for password field (increased timeout)
      "Password input field not found after entering email. Cognito might be validating email or password field has different selector. Try checking the browser window manually."
    );
  }
  
  console.log("Password field found! Filling in password...");
  
  // Scroll password field into view
  await driver.executeScript("arguments[0].scrollIntoView(true);", passwordInput);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Wait for field to be ready
  await driver.wait(until.elementIsVisible(passwordInput), 5000);
  await driver.wait(until.elementIsEnabled(passwordInput), 5000);
  
  // Clear and fill password
  await passwordInput.clear();
  await new Promise(resolve => setTimeout(resolve, 300));
  await passwordInput.sendKeys(password);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify password was entered
  const passwordLength = await passwordInput.getAttribute("value");
  if (!passwordLength || passwordLength.length === 0) {
    console.log("Password not entered, retrying...");
    await passwordInput.clear();
    await passwordInput.sendKeys(password);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("Password entered successfully!");
  
  // Find and click submit button - try multiple selectors
  console.log("Step 5: Looking for submit button...");
  let submitButton = null;
  
  // Wait a bit for submit button to appear after password is entered
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try different selectors for submit button
  const submitSelectors = [
    By.css('input[type="submit"]'),
    By.css('button[type="submit"]'),
    By.xpath("//button[contains(text(), 'Sign in')]"),
    By.xpath("//button[contains(text(), 'Sign In')]"),
    By.xpath("//button[contains(text(), 'Sign')]"),
    By.xpath("//input[@value='Sign in']"),
    By.xpath("//input[@value='Sign In']"),
    By.xpath("//input[@value='Sign']"),
    By.xpath("//button[contains(., 'Sign')]"),
    By.css('button[class*="submit"]'),
    By.css('input[class*="submit"]'),
    By.css('button[class*="button"]'),
    By.xpath("//form//button"),
    By.xpath("//form//input[@type='submit']"),
  ];
  
  // Wait for submit button to appear
  submitButton = await driver.wait(
    async () => {
      for (const selector of submitSelectors) {
        try {
          const buttons = await driver.findElements(selector);
          for (const btn of buttons) {
            try {
              const isDisplayed = await btn.isDisplayed();
              if (isDisplayed) {
                return btn;
              }
            } catch (e) {
              // Element might not be visible yet
            }
          }
        } catch (e) {
          // Try next selector
        }
      }
      return null;
    },
    10000,
    "Submit button not found on Cognito login page"
  );
  
  if (!submitButton) {
    throw new Error("Submit button not found on Cognito login page after trying all selectors");
  }
  
  console.log("Submit button found! Clicking...");
  
  // Scroll button into view
  await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", submitButton);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Try clicking with JavaScript first (more reliable)
  try {
    await driver.executeScript("arguments[0].click();", submitButton);
    console.log("Submit button clicked using JavaScript");
  } catch (e) {
    console.log("JavaScript click failed, trying normal click...");
    try {
      await submitButton.click();
      console.log("Submit button clicked using normal click");
    } catch (e2) {
      throw new Error(`Failed to click submit button: ${e2.message}`);
    }
  }
  
  // Wait for form submission and page transition
  console.log("Waiting for form submission...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 4: Wait for verification code prompt OR successful login
  console.log("\n⏳ Waiting for verification code prompt or login completion...");
  console.log("   If verification code appears, please enter it manually in the browser.\n");
  
  try {
    // Wait for either:
    // 1. Verification code input field (MFA challenge)
    // 2. Redirect back to app (login successful)
    // 3. Error message (wrong credentials)
    
    await driver.wait(
      async () => {
        const currentUrl = await driver.getCurrentUrl();
        
        // Check if we're back in the app (login successful)
        if (currentUrl.includes(baseUrl.replace("http://", "").replace("https://", "")) && 
            !currentUrl.includes("amazoncognito.com") && 
            !currentUrl.includes("cognito")) {
          return true;
        }
        
        // Check for verification code input
        try {
          const codeInputs = await driver.findElements(
            By.xpath("//input[@name='code'] | //input[@id='code'] | //input[contains(@placeholder, 'code')] | //input[contains(@placeholder, 'Code')] | //input[@type='text'] | //input[contains(@name, 'code')]")
          );
          if (codeInputs.length > 0) {
            for (const codeInput of codeInputs) {
              try {
                const isDisplayed = await codeInput.isDisplayed();
                if (isDisplayed) {
                  console.log("\n✅ Verification code input found!");
                  console.log("   Please enter the verification code manually in the browser window...");
                  console.log("   The test will wait for you to enter the code and continue.\n");
                  return false; // Don't return yet, wait for user to enter code
                }
              } catch (e) {
                // Input might not be visible yet
              }
            }
          }
        } catch (e) {
          // Code input not found yet
        }
        
        // Check for error messages
        try {
          const errorMessages = await driver.findElements(
            By.xpath("//*[contains(text(), 'Incorrect')] | //*[contains(text(), 'error')] | //*[contains(text(), 'Error')]")
          );
          for (const error of errorMessages) {
            const isDisplayed = await error.isDisplayed();
            if (isDisplayed) {
              const errorText = await error.getText();
              throw new Error(`Login failed: ${errorText}`);
            }
          }
        } catch (e) {
          if (e.message.includes("Login failed")) {
            throw e; // Re-throw login errors
          }
        }
        
        return false; // Continue waiting
      },
      verificationTimeout,
      `Login did not complete within ${verificationTimeout / 1000} seconds. Please check if verification code was entered correctly.`
    );
    
    // Additional wait to ensure we're fully redirected
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalUrl = await driver.getCurrentUrl();
    
    // Check if we're on the app (not Cognito)
    if (finalUrl.includes("amazoncognito.com") || finalUrl.includes("cognito")) {
      // Still on Cognito - might be waiting for verification code
      console.log("\n⚠️  Still on Cognito page. Waiting for manual verification code entry...");
      console.log("   Please enter the verification code in the browser window.\n");
      
      // Wait for redirect back to app
      await driver.wait(
        until.urlContains(baseUrl.replace("http://", "").replace("https://", "")),
        verificationTimeout,
        "Did not redirect back to app after verification code entry"
      );
      
      // Additional wait for app to load
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Step 5: Verify authentication succeeded
    console.log("Step 5: Verifying authentication...");
    const currentUrl = await driver.getCurrentUrl();
    
    if (currentUrl.includes('/login')) {
      throw new Error("Still on login page - authentication may have failed");
    }
    
    // Check if tokens are set
    const tokensSet = await driver.executeScript(`
      return localStorage.getItem('access_token') !== null && 
             localStorage.getItem('id_token') !== null;
    `);
    
    if (!tokensSet) {
      throw new Error("Tokens not set in localStorage - authentication failed");
    }
    
    // Wait for AuthContext to load user data
    console.log("Waiting for user data to load...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if user is authenticated
    const isAuthenticated = await driver.executeScript(`
      return localStorage.getItem('access_token') !== null;
    `);
    
    if (!isAuthenticated) {
      throw new Error("User is not authenticated after login");
    }
    
    console.log("✅ Login successful! User is authenticated.\n");
    return true;
    
  } catch (error) {
    if (error.message.includes("Login failed") || 
        error.message.includes("Incorrect") ||
        error.message.includes("authentication failed")) {
      throw error;
    }
    
    // Check if we're on error page
    const currentUrl = await driver.getCurrentUrl();
    const pageText = await driver.findElement(By.tagName("body")).getText();
    
    if (pageText.includes("Incorrect") || pageText.includes("error")) {
      throw new Error(`Login failed: ${pageText}`);
    }
    
    // If we're still on Cognito, user might need to enter verification code
    if (currentUrl.includes("amazoncognito.com") || currentUrl.includes("cognito")) {
      console.log("\n⚠️  Still waiting for verification code...");
      console.log("   Please enter the verification code in the browser window.\n");
      throw new Error("Verification code entry timeout. Please check the browser window and enter code manually.");
    }
    
    throw error;
  }
}

/**
 * Authenticates as admin using real Cognito login and navigates to a page
 * @param {WebDriver} driver - Selenium WebDriver instance
 * @param {string} baseUrl - Base URL of the application
 * @param {string} targetUrl - URL to navigate to after authentication
 * @param {Object} credentials - Login credentials (optional, uses env vars if not provided)
 * @param {number} verificationTimeout - Max time to wait for verification code
 */
async function authenticateAsAdminWithRealLogin(driver, baseUrl, targetUrl = '/', credentials = null, verificationTimeout = 120000) {
  // Get credentials from parameter or environment variables
  const email = credentials?.email || process.env.ADMIN_EMAIL || process.env.TEST_ADMIN_EMAIL;
  const password = credentials?.password || process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD;
  
  if (!email || !password) {
    throw new Error(
      "Admin credentials are required for real login.\n" +
      "Set environment variables: ADMIN_EMAIL and ADMIN_PASSWORD\n" +
      "OR pass credentials object: { email: '...', password: '...' }\n" +
      "OR set in test: process.env.ADMIN_EMAIL and process.env.ADMIN_PASSWORD"
    );
  }
  
  // Perform real login
  await loginWithRealCredentials(driver, baseUrl, { email, password }, verificationTimeout);
  
  // Navigate to target URL
  if (targetUrl && targetUrl !== '/') {
    console.log(`Navigating to: ${targetUrl}`);
    await driver.get(`${baseUrl}${targetUrl}`);
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for error states
    const currentUrl = await driver.getCurrentUrl();
    
    // Check for 403 Forbidden
    const forbiddenText = await driver.findElements(
      By.xpath("//h1[contains(text(), '403')] | //h1[contains(text(), 'Forbidden')] | //p[contains(text(), 'permission')]")
    );
    if (forbiddenText.length > 0) {
      const forbiddenMessage = await forbiddenText[0].getText();
      throw new Error(
        "Got 403 Forbidden: " + forbiddenMessage + 
        "\nThis account may not have ADMIN role."
      );
    }
    
    if (currentUrl.includes('/login')) {
      throw new Error("Redirected to login - authentication failed");
    }
  }
  
  // Wait for page to finish loading
  const { waitForPageLoad } = require('./auth-helper');
  await waitForPageLoad(driver, 20000);
}

module.exports = {
  loginWithRealCredentials,
  authenticateAsAdminWithRealLogin,
};

