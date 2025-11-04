import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { createDriver, waitForElement, tapElement } from './helpers/driver';
import { switchToWebView, switchToFlutter, findWebElementAny } from './helpers/driver';

describe('Mobile Login Flow', () => {
  let driver: WebdriverIO.Browser;

  before(async function() {
    this.timeout(120000);
    driver = await createDriver();
    
    // Wait for Flutter's first frame to be rendered (prevents "app closed" issues)
    try {
      await driver.execute('flutter:waitForFirstFrame');
      console.log('✅ Flutter first frame ready');
    } catch (e) {
      console.warn('Warning: waitForFirstFrame failed, continuing anyway:', e);
      // Wait a bit as fallback
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  after(async function() {
    if (driver) {
      await driver.deleteSession();
    }
  });

  it('should launch app and display login screen', async function() {
    this.timeout(30000);
    // Wait for the sign in button to appear
    const signInButton = await waitForElement(driver, 'sign_in_button', 30000);
    expect(signInButton).to.exist;
  });

  it('should tap Sign In button', async function() {
    this.timeout(30000);
    await waitForElement(driver, 'sign_in_button', 30000);
    await tapElement(driver, 'sign_in_button');
    // Wait briefly for webview to appear
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  it('should handle Hosted UI login flow', async function() {
    this.timeout(120000);

    const email = process.env.USER_EMAIL;
    const password = process.env.USER_PASSWORD;
    if (!email || !password) {
      throw new Error('Set USER_EMAIL and USER_PASSWORD environment variables before running tests.');
    }

    // Switch to WEBVIEW and fill the Hosted UI form
    await switchToWebView(driver);

    const usernameSelectors = [
      'input[name="username"]',
      'input#username',
      'input[type="email"]',
      'input[name="email"]'
    ];
    const passwordSelectors = [
      'input[name="password"]',
      'input#password',
      'input[type="password"]'
    ];
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button#signIn',
      'button:has-text("Sign in")'
    ];

    const userField = await findWebElementAny(driver, usernameSelectors, 30000);
    await userField.setValue(email);

    const passField = await findWebElementAny(driver, passwordSelectors, 15000);
    await passField.setValue(password);

    const submitBtn = await findWebElementAny(driver, submitSelectors, 15000);
    await submitBtn.click();

    // Handle MFA if enabled
    const mfa = process.env.MFA_CODE;
    const mfaSelectors = [
      'input[name="otp"]',
      'input#code',
      'input[name="code"]',
      'input[type="text"][placeholder*="code" i]'
    ];

    // Check if MFA prompt appears (wait up to 15 seconds)
    try {
      const mfaField = await findWebElementAny(driver, mfaSelectors, 15000);
      
      if (mfa) {
        // Automated MFA - use provided code
        console.log('MFA code provided via environment variable, entering automatically...');
        await mfaField.setValue(mfa);
        const mfaSubmit = await findWebElementAny(driver, submitSelectors, 10000);
        await mfaSubmit.click();
      } else {
        // Manual MFA - wait for user to enter code
        console.log('⚠️  MFA CODE REQUIRED - Please enter the authentication code manually in the emulator/webview');
        console.log('⏳ Waiting up to 3 minutes for you to enter and submit the MFA code...');
        
        // Wait for MFA field to disappear or dashboard to appear (user submitted MFA)
        // Check every 2 seconds for up to 3 minutes
        const maxWaitTime = 180000; // 3 minutes
        const checkInterval = 2000; // 2 seconds
        const startTime = Date.now();
        let mfaComplete = false;

        while (Date.now() - startTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          
          // Check if we're back in Flutter context (login succeeded)
          try {
            await switchToFlutter(driver);
            const dashboardCard = await waitForElement(driver, 'dashboard_welcome_card', 5000);
            if (dashboardCard) {
              mfaComplete = true;
              break;
            }
          } catch (e) {
            // Still in webview, continue waiting
            try {
              await switchToWebView(driver);
            } catch (e2) {
              // Webview might have closed, try Flutter again
              try {
                await switchToFlutter(driver);
                const dashboardCard = await waitForElement(driver, 'dashboard_welcome_card', 5000);
                if (dashboardCard) {
                  mfaComplete = true;
                  break;
                }
              } catch (e3) {
                // Still processing
              }
            }
          }
        }

        if (!mfaComplete) {
          throw new Error('MFA code not entered within 3 minutes. Please ensure you enter the code manually.');
        }
        console.log('✅ MFA completed - proceeding to verify dashboard');
      }
    } catch (e) {
      // MFA field not found - MFA might not be enabled or already completed
      console.log('MFA prompt not detected - either MFA is disabled or login completed without it');
    }

    // After redirect back to app, switch to Flutter context and verify dashboard
    await switchToFlutter(driver);
    const dashboardCard = await waitForElement(driver, 'dashboard_welcome_card', 60000);
    expect(dashboardCard).to.exist;
  });

  it('should verify dashboard widget exists after login', async function() {
    this.timeout(60000);
    // Wait for the dashboard welcome card - this confirms we're logged in
    const dashboardCard = await waitForElement(driver, 'dashboard_welcome_card', 60000);
    expect(dashboardCard).to.exist;
    
    // Verify we can see profile action card
    const profileCard = await waitForElement(driver, 'profile_action_card', 10000);
    expect(profileCard).to.exist;
  });
});

