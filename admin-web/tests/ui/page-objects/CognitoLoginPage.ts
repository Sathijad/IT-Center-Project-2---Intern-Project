import { WebDriver, By, until, Key } from 'selenium-webdriver';

/**
 * Page Object for AWS Cognito Login Page
 * Handles the Cognito-hosted login form
 */
export class CognitoLoginPage {
  constructor(private driver: WebDriver) {}

  /**
   * Wait for Cognito login page to load
   */
  async waitForPageLoad(): Promise<void> {
    // Wait for either the email input or username input (Cognito can use either)
    try {
      await this.driver.wait(
        until.elementLocated(By.id('signInFormUsername')),
        15000
      );
    } catch {
      // Try alternative selectors
      try {
        await this.driver.wait(
          until.elementLocated(By.css('input[name="username"]')),
          15000
        );
      } catch {
        await this.driver.wait(
          until.elementLocated(By.css('input[type="email"]')),
          15000
        );
      }
    }
  }

  /**
   * Enter email/username in the Cognito login form and click Next
   */
  async enterEmail(email: string): Promise<void> {
    try {
      const emailInput = await this.driver.wait(
        until.elementLocated(By.id('signInFormUsername')),
        10000
      );
      await emailInput.clear();
      await emailInput.sendKeys(email);
      
      // Click Next button to go to password field
      await this.clickNextButton();
    } catch {
      // Try alternative selectors
      try {
        const emailInput = await this.driver.wait(
          until.elementLocated(By.css('input[name="username"]')),
          10000
        );
        await emailInput.clear();
        await emailInput.sendKeys(email);
        
        // Click Next button
        await this.clickNextButton();
      } catch {
        const emailInput = await this.driver.wait(
          until.elementLocated(By.css('input[type="email"]')),
          10000
        );
        await emailInput.clear();
        await emailInput.sendKeys(email);
        
        // Click Next button
        await this.clickNextButton();
      }
    }
  }

  /**
   * Enter password in the Cognito login form and click Next
   */
  async enterPassword(password: string): Promise<void> {
    // Wait a bit for password field to appear after clicking Next from email
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Try to find password field by ID first
      const passwordInput = await this.driver.wait(
        until.elementLocated(By.id('signInFormPassword')),
        15000
      );
      // Click to focus the field
      await passwordInput.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      await passwordInput.clear();
      await passwordInput.sendKeys(password);
      
      // Click Next button to go to verification code field
      await this.clickNextButton();
    } catch {
      // Try alternative selectors
      try {
        const passwordInput = await this.driver.wait(
          until.elementLocated(By.css('input[type="password"]')),
          15000
        );
        await passwordInput.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        await passwordInput.clear();
        await passwordInput.sendKeys(password);
        
        // Click Next button
        await this.clickNextButton();
      } catch {
        try {
          const passwordInput = await this.driver.wait(
            until.elementLocated(By.css('input[name="password"]')),
            15000
          );
          await passwordInput.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          await passwordInput.clear();
          await passwordInput.sendKeys(password);
          
          // Click Next button
          await this.clickNextButton();
        } catch {
          // Last resort: try to find any password input
          const passwordInputs = await this.driver.findElements(By.css('input[type="password"]'));
          if (passwordInputs.length > 0) {
            const passwordInput = passwordInputs[0];
            await passwordInput.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            await passwordInput.clear();
            await passwordInput.sendKeys(password);
            await this.clickNextButton();
          } else {
            throw new Error('Password input field not found');
          }
        }
      }
    }
  }

  /**
   * Click the Next button (used between email -> password -> verification steps)
   */
  async clickNextButton(): Promise<void> {
    try {
      // Try to find Next button by various selectors
      const nextButton = await this.driver.wait(
        until.elementLocated(
          By.xpath("//button[contains(text(), 'Next') or contains(text(), 'Continue') or @type='submit']")
        ),
        10000
      );
      await nextButton.click();
      // Wait a bit for the next step to load
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch {
      // Try alternative: button with id containing 'next' or 'continue'
      try {
        const nextButton = await this.driver.wait(
          until.elementLocated(
            By.css('button[id*="next" i], button[id*="continue" i], button[type="submit"]')
          ),
          10000
        );
        await nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch {
        // If Next button not found, try Sign In button (might be the same)
        try {
          const signInButton = await this.driver.wait(
            until.elementLocated(By.id('signInSubmitButton')),
            10000
          );
          await signInButton.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch {
          // Try any submit button
          try {
            const submitButton = await this.driver.wait(
              until.elementLocated(By.css('button[type="submit"]')),
              10000
            );
            await submitButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch {
            console.log('⚠️  Next button not found, continuing...');
          }
        }
      }
    }
  }

  /**
   * Click the Sign In button (legacy - may not be needed with Next button flow)
   */
  async clickSignIn(): Promise<void> {
    // This might not be needed if we use Next button, but keeping for compatibility
    try {
      const signInButton = await this.driver.wait(
        until.elementLocated(By.id('signInSubmitButton')),
        5000
      );
      await signInButton.click();
    } catch {
      // If Sign In button not found, Next button might have already been clicked
      console.log('⚠️  Sign In button not found, may have already proceeded');
    }
  }

  /**
   * Wait for verification code input field to appear
   * This indicates that MFA/verification is required
   */
  async waitForVerificationCodeInput(): Promise<boolean> {
    try {
      await this.driver.wait(
        until.elementLocated(By.id('confirmationCode')),
        15000
      );
      return true;
    } catch {
      // Try alternative selectors
      try {
        await this.driver.wait(
          until.elementLocated(By.css('input[name="code"]')),
          15000
        );
        return true;
      } catch {
        try {
          await this.driver.wait(
            until.elementLocated(By.css('input[placeholder*="code" i]')),
            15000
          );
          return true;
        } catch {
          return false;
        }
      }
    }
  }

  /**
   * Check if verification code input is visible
   */
  async isVerificationCodeInputVisible(): Promise<boolean> {
    try {
      const codeInput = await this.driver.findElement(By.id('confirmationCode'));
      return await codeInput.isDisplayed();
    } catch {
      try {
        const codeInput = await this.driver.findElement(By.css('input[name="code"]'));
        return await codeInput.isDisplayed();
      } catch {
        return false;
      }
    }
  }

  /**
   * Wait for user to manually enter verification code
   * This function will pause execution and wait for the user to:
   * 1. Enter the verification code
   * 2. Click the Verify/Submit button
   * 3. Complete the authentication flow
   */
  async waitForManualVerificationCodeEntry(timeoutSeconds: number = 300): Promise<void> {
    console.log('\n========================================');
    console.log('⏸️  PAUSED FOR MANUAL VERIFICATION CODE');
    console.log('========================================');
    console.log('Please manually enter the verification code in the browser.');
    console.log(`Waiting up to ${timeoutSeconds} seconds for you to complete verification...`);
    console.log('========================================\n');

    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    // Wait for the verification code input to appear
    const hasVerificationInput = await this.waitForVerificationCodeInput();
    
    if (!hasVerificationInput) {
      console.log('⚠️  Verification code input not found. Checking if already authenticated...');
      // Maybe already authenticated or redirected
      await new Promise(resolve => setTimeout(resolve, 3000));
      return;
    }

    // Poll to check if user has completed verification
    // We'll check if we've been redirected away from Cognito
    while (Date.now() - startTime < timeoutMs) {
      const currentUrl = await this.driver.getCurrentUrl();
      
      // If we're redirected to the callback URL or dashboard, verification is complete
      if (currentUrl.includes('/auth/callback') || 
          currentUrl.includes('localhost:5173') && !currentUrl.includes('cognito')) {
        console.log('✅ Verification completed! Redirected to application.');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for redirect to complete
        return;
      }

      // Check if verification code input is still visible
      // If it's gone, user might have submitted
      const isVisible = await this.isVerificationCodeInputVisible();
      if (!isVisible) {
        console.log('✅ Verification code input disappeared. Waiting for redirect...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        const newUrl = await this.driver.getCurrentUrl();
        if (newUrl.includes('/auth/callback') || 
            (newUrl.includes('localhost:5173') && !newUrl.includes('cognito'))) {
          return;
        }
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Timeout reached
    const finalUrl = await this.driver.getCurrentUrl();
    if (finalUrl.includes('cognito')) {
      throw new Error(`Timeout: Verification code entry took longer than ${timeoutSeconds} seconds. Please check the browser.`);
    }
  }

  /**
   * Check if we're on the Cognito login page
   */
  async isOnCognitoPage(): Promise<boolean> {
    const currentUrl = await this.driver.getCurrentUrl();
    return currentUrl.includes('cognito') || currentUrl.includes('amazoncognito.com');
  }

  /**
   * Wait for redirect back to the application
   */
  async waitForRedirectToApp(timeoutSeconds: number = 30): Promise<void> {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    while (Date.now() - startTime < timeoutMs) {
      const currentUrl = await this.driver.getCurrentUrl();
      
      // Check if we're back in the app (not on Cognito)
      if (currentUrl.includes('localhost:5173') && !currentUrl.includes('cognito')) {
        console.log('✅ Redirected back to application');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for page to load
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Timeout: Did not redirect back to application within ${timeoutSeconds} seconds`);
  }
}

