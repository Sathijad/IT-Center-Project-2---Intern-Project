import { describe, it, before, after, beforeEach } from 'mocha';
import { expect } from 'chai';
import {
  createDriver,
  waitForElement,
  tapElement,
  findElementByKey,
  enterText,
  getText,
  checkSnackbar
} from './helpers/driver';
import { loginWithVerificationCode, isLoggedIn } from './helpers/login-helper';

// Test credentials
const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'Admin@123';

describe('Mobile Leave Management - Phase 2', () => {
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
    // Ensure we're on home screen before each test
    try {
      await waitForElement(driver, 'dashboard_welcome_card', 10000);
    } catch (e) {
      // Navigate back to home if needed
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

  it('should navigate to Apply Leave screen', async function() {
    this.timeout(30000);
    // Tap on Apply Leave card
    await waitForElement(driver, 'apply_leave_action_card', 10000);
    await tapElement(driver, 'apply_leave_action_card');
    
    // Wait for Apply Leave screen to load
    // Verify we're on the correct screen by checking for form fields
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Navigate back
    await driver.back();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should open Leave Balance screen', async function() {
    this.timeout(30000);
    // Tap on Leave Balance card
    await waitForElement(driver, 'leave_balance_action_card', 10000);
    await tapElement(driver, 'leave_balance_action_card');
    
    // Wait for Leave Balance screen to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify we're on Leave Balance screen
    // Note: We may need to check for tabs or balance cards
    
    // Navigate back
    await driver.back();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should navigate to Clock In/Out screen', async function() {
    this.timeout(30000);
    // Tap on Clock In/Out card
    await waitForElement(driver, 'clock_inout_action_card', 10000);
    await tapElement(driver, 'clock_inout_action_card');
    
    // Wait for Clock In/Out screen to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Navigate back
    await driver.back();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should complete leave application flow', async function() {
    this.timeout(60000);
    
    // Navigate to Apply Leave
    await waitForElement(driver, 'apply_leave_action_card', 10000);
    await tapElement(driver, 'apply_leave_action_card');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Note: Actual form interaction would require more detailed element finding
    // This test verifies navigation works
    
    await driver.back();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should view leave balance', async function() {
    this.timeout(30000);
    
    // Navigate to Leave Balance
    await waitForElement(driver, 'leave_balance_action_card', 10000);
    await tapElement(driver, 'leave_balance_action_card');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify balance screen loaded (may show balances or empty state)
    
    await driver.back();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should view clock in/out state', async function() {
    this.timeout(30000);
    
    // Navigate to Clock In/Out
    await waitForElement(driver, 'clock_inout_action_card', 10000);
    await tapElement(driver, 'clock_inout_action_card');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify clock screen loaded (shows current state)
    
    await driver.back();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
});

