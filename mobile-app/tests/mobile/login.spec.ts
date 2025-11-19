import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { createDriver, waitForElement } from './helpers/driver';
import { loginWithVerificationCode, isLoggedIn } from './helpers/login-helper';

const TEST_EMAIL = process.env.MOBILE_TEST_EMAIL || 'admin@test.com';
const TEST_PASSWORD = process.env.MOBILE_TEST_PASSWORD || 'Admin@123';

describe('Mobile Login Flow', () => {
  let driver: WebdriverIO.Browser;

  before(async function() {
    this.timeout(180000);
    driver = await createDriver();
  });

  after(async function() {
    if (driver) {
      await driver.deleteSession();
    }
  });

  it('should launch app and display login screen', async function() {
    this.timeout(45000);
    const signInButton = await waitForElement(driver, 'sign_in_button', 30000);
    expect(signInButton).to.exist;

    await waitForElement(driver, 'email_field', 10000);
    await waitForElement(driver, 'password_field', 10000);
  });

  it('should sign in with verification code support', async function() {
    this.timeout(180000);

    if (await isLoggedIn(driver)) {
      console.log('✅ Already logged in - skipping login helper');
      return;
    }

    console.log('🔐 Starting login helper flow (manual MFA supported)...');
    await loginWithVerificationCode(driver, TEST_EMAIL, TEST_PASSWORD, 90000);
    await waitForElement(driver, 'dashboard_welcome_card', 60000);
  });

  it('should show dashboard widgets after login', async function() {
    this.timeout(60000);
    const dashboardCard = await waitForElement(driver, 'dashboard_welcome_card', 60000);
    expect(dashboardCard).to.exist;

    const profileCard = await waitForElement(driver, 'profile_action_card', 15000);
    expect(profileCard).to.exist;
  });

});

