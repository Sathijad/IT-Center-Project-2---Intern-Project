import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from './test-base.js';

/**
 * Helper for authenticating with Cognito using email and password
 * This handles the full Cognito OAuth flow
 */
export class AuthHelper {
  constructor(private driver: WebDriver) {}

  /**
   * Perform login with email and password through Cognito
   * This will:
   * 1. Navigate to login page
   * 2. Click "Sign in with Cognito"
   * 3. Fill in email and password on Cognito hosted UI
   * 4. Wait for redirect back to app
   * 5. Extract tokens from localStorage
   */
  async loginWithCredentials(email: string, password: string): Promise<void> {
    const baseUrl = getBaseUrl();
    
    // Step 1: Navigate to login page
    await this.driver.get(`${baseUrl}/login`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Click "Sign in with Cognito" button
    const signInButton = await this.driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Sign in with Cognito')]")),
      10000
    );
    await signInButton.click();

    // Step 3: Wait for Cognito hosted UI to load
    // Cognito hosted UI typically has a form with username/password fields
    await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 4: Fill in email (username field in Cognito)
      try {
        // Wait for Cognito page to fully load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try different possible selectors for Cognito login form
        const usernameSelectors = [
          By.id('username'),
          By.name('username'),
          By.xpath("//input[@type='email']"),
          By.xpath("//input[@placeholder*='email' or @placeholder*='Email' or @placeholder*='Username']"),
          By.css('input[type="email"]'),
          By.css('input[name="username"]'),
          By.css('input#username'),
        ];

        let usernameField = null;
        for (const selector of usernameSelectors) {
          try {
            usernameField = await this.driver.wait(until.elementLocated(selector), 10000);
            await this.driver.wait(until.elementIsVisible(usernameField), 5000);
            break;
          } catch {
            continue;
          }
        }

        if (!usernameField) {
          throw new Error('Could not find username/email field on Cognito login page');
        }

        await usernameField.clear();
        await usernameField.sendKeys(email);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 5: Look for and click "Next" or "Continue" button (Cognito two-step flow)
        const nextButtonSelectors = [
          By.xpath("//button[contains(text(), 'Next')]"),
          By.xpath("//button[contains(text(), 'Continue')]"),
          By.xpath("//button[contains(text(), 'next')]"),
          By.xpath("//button[contains(text(), 'continue')]"),
          By.xpath("//input[@value='Next' or @value='Continue']"),
          By.id('next'),
          By.css('button[type="submit"]'),
          By.xpath("//button[@type='submit']"),
        ];

        let nextButton = null;
        for (const selector of nextButtonSelectors) {
          try {
            nextButton = await this.driver.wait(until.elementLocated(selector), 5000);
            await this.driver.wait(until.elementIsVisible(nextButton), 3000);
            break;
          } catch {
            continue;
          }
        }

        if (nextButton) {
          await nextButton.click();
          // Wait for password field to appear
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // If no next button, try pressing Enter
          await usernameField.sendKeys('\n');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Step 6: Fill in password (after clicking Next)
        const passwordSelectors = [
          By.id('password'),
          By.name('password'),
          By.xpath("//input[@type='password']"),
          By.css('input[type="password"]'),
          By.css('input[name="password"]'),
          By.css('input#password'),
        ];

        let passwordField = null;
        for (const selector of passwordSelectors) {
          try {
            passwordField = await this.driver.wait(until.elementLocated(selector), 10000);
            await this.driver.wait(until.elementIsVisible(passwordField), 5000);
            break;
          } catch {
            continue;
          }
        }

        if (!passwordField) {
          throw new Error('Could not find password field on Cognito login page');
        }

        await passwordField.clear();
        await passwordField.sendKeys(password);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 7: Submit the form (Sign In button)
        const submitSelectors = [
          By.xpath("//button[contains(text(), 'Sign in')]"),
          By.xpath("//button[contains(text(), 'Sign In')]"),
          By.xpath("//button[contains(text(), 'Login')]"),
          By.xpath("//button[@type='submit']"),
          By.xpath("//input[@type='submit']"),
          By.id('signIn'),
          By.id('sign-in-button'),
          By.css('button[type="submit"]'),
        ];

        let submitButton = null;
        for (const selector of submitSelectors) {
          try {
            submitButton = await this.driver.wait(until.elementLocated(selector), 5000);
            await this.driver.wait(until.elementIsVisible(submitButton), 3000);
            break;
          } catch {
            continue;
          }
        }

        if (submitButton) {
          await submitButton.click();
        } else {
          // Try pressing Enter on password field
          await passwordField.sendKeys('\n');
        }

      // Step 7: Wait for redirect back to app (callback URL)
      // The app should redirect to /auth/callback and then to dashboard
      await this.driver.wait(
        async () => {
          const currentUrl = await this.driver.getCurrentUrl();
          return currentUrl.includes(baseUrl) && !currentUrl.includes('cognito');
        },
        30000
      );

      // Step 8: Wait a bit more for tokens to be stored
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify we have tokens
      const hasToken = await this.driver.executeScript(
        'return !!localStorage.getItem("access_token")'
      );

      if (!hasToken) {
        console.warn('Warning: No access token found after login. The login may have failed or tokens are stored differently.');
      }

    } catch (error) {
      console.error('Error during Cognito login:', error);
      // Take a screenshot for debugging
      await this.driver.takeScreenshot().then(() => {
        console.log('Screenshot taken. Current URL:', 'Check screenshots directory');
      }).catch(err => {
        console.log('Could not take screenshot:', err);
      });
      const currentUrl = await this.driver.getCurrentUrl();
      console.log('Current URL:', currentUrl);
      throw error;
    }
  }

  /**
   * Check if user is authenticated by checking for token in localStorage
   */
  async isAuthenticated(): Promise<boolean> {
    const hasToken = await this.driver.executeScript(
      'return !!localStorage.getItem("access_token")'
    );
    return hasToken;
  }

  /**
   * Logout by clearing tokens and navigating to logout
   */
  async logout(): Promise<void> {
    await this.driver.executeScript(`
      localStorage.removeItem('access_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.clear();
    `);
    
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/login`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Set auth token directly (for testing with mock tokens)
   */
  async setAuthToken(token: string): Promise<void> {
    await this.driver.executeScript(`
      localStorage.setItem('access_token', arguments[0]);
      localStorage.setItem('id_token', 'test-id-token');
    `, token);
  }
}

