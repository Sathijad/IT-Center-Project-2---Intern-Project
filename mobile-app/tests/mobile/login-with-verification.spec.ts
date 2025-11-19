import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { createDriver, waitForElement } from './helpers/driver';
import { loginWithVerificationCode, isLoggedIn } from './helpers/login-helper';

/**
 * Login test with verification code support
 * 
 * IMPORTANT: When verification code is required:
 * 1. Test will pause
 * 2. Check your email/SMS for the code
 * 3. Enter code in the app manually
 * 4. Test will continue automatically
 */
const TEST_EMAIL = process.env.MOBILE_TEST_EMAIL || 'admin@test.com';
const TEST_PASSWORD = process.env.MOBILE_TEST_PASSWORD || 'Admin@123';

describe('Mobile Login with Verification - Phase 2', () => {
  let driver: WebdriverIO.Browser;

  before(async function() {
    this.timeout(180000); // 3 minutes for login + verification
    driver = await createDriver();
  });

  after(async function() {
    if (driver) {
      await driver.deleteSession();
    }
  });

  it('should login with email, password, and verification code', async function() {
    this.timeout(240000); // 4 minutes total

    if (await isLoggedIn(driver, 10000)) {
      console.log('✅ Already logged in - skipping login helper');
      await waitForElement(driver, 'dashboard_welcome_card', 30000);
      return;
    }

    await waitForElement(driver, 'sign_in_button', 30000);
    await loginWithVerificationCode(driver, TEST_EMAIL, TEST_PASSWORD, 90000);
    await waitForElement(driver, 'dashboard_welcome_card', 60000);
    expect(await isLoggedIn(driver, 5000)).to.be.true;
  });
});

