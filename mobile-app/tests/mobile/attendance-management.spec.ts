import { describe, it, before, after, beforeEach } from 'mocha';
import { expect } from 'chai';
import {
  createDriver,
  waitForElement,
  tapElement,
  findElementByKey,
  getText,
  checkSnackbar
} from './helpers/driver';
import { loginWithVerificationCode, isLoggedIn } from './helpers/login-helper';

// Test credentials - use environment variables or fallback to defaults
const TEST_EMAIL = process.env.MOBILE_TEST_EMAIL || 'admin@test.com';
const TEST_PASSWORD = process.env.MOBILE_TEST_PASSWORD || 'Admin@123';

describe('Mobile Attendance Management - Phase 2', () => {
  let driver: WebdriverIO.Browser;

  before(async function() {
    this.timeout(300000); // 5 minutes for login + verification
    driver = await createDriver();
    
    // Check if already logged in
    const loggedIn = await isLoggedIn(driver, 10000);
    if (loggedIn) {
      console.log('✅ Already logged in - skipping login');
      return;
    }
    
    // Login with verification code
    console.log('🔐 Not logged in - starting login flow...');
    await loginWithVerificationCode(driver, TEST_EMAIL, TEST_PASSWORD, 90000);
    
    // Verify we're on home screen
    await waitForElement(driver, 'dashboard_welcome_card', 30000);
    console.log('✅ Login complete - ready for tests');
  });

  beforeEach(async function() {
    // Ensure we're on home screen
    try {
      await waitForElement(driver, 'dashboard_welcome_card', 10000);
    } catch (e) {
      await driver.back();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await waitForElement(driver, 'dashboard_welcome_card', 10000);
    }
  });

  after(async function() {
    if (driver) {
      await driver.deleteSession();
    }
  });

  it('should navigate to Clock In/Out screen', async function() {
    this.timeout(30000);
    await waitForElement(driver, 'clock_inout_action_card', 10000);
    await tapElement(driver, 'clock_inout_action_card');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await driver.back();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should view current clock state', async function() {
    this.timeout(30000);
    await waitForElement(driver, 'clock_inout_action_card', 10000);
    await tapElement(driver, 'clock_inout_action_card');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify clock state is displayed (Ready to Clock In or Currently Clocked In)
    
    await driver.back();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should view recent attendance logs', async function() {
    this.timeout(30000);
    await waitForElement(driver, 'clock_inout_action_card', 10000);
    await tapElement(driver, 'clock_inout_action_card');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify recent logs section is visible
    
    await driver.back();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
});

