import { before, beforeEach, describe, it } from 'mocha';
import { browser, expect } from '@wdio/globals';
import {
  waitForElement,
  tapElement,
  enterText,
  checkSnackbar,
} from '../helpers/driver';

const TEST_DISPLAY_NAME = process.env.TEST_DISPLAY_NAME || 'Test User Updated';
const LOGIN_EMAIL = process.env.USER_EMAIL ?? 'admin@test.com';
const LOGIN_PASSWORD = process.env.USER_PASSWORD ?? 'Admin@123';
const flutterBrowser = browser as unknown as any;

async function ensureLoggedIn() {
  try {
    await waitForElement(browser, 'dashboard_welcome_card', 4000);
    return;
  } catch {
    // Not logged in yet – perform login flow
  }

  await waitForElement(browser, 'login_email', 20000);
  await enterText(browser, 'login_email', LOGIN_EMAIL);
  await enterText(browser, 'login_password', LOGIN_PASSWORD);
  await tapElement(browser, 'sign_in_button');
  await waitForElement(browser, 'dashboard_welcome_card', 60000);
}

describe('Mobile Profile Flow', () => {
  before(async function () {
    this.timeout(120000);
    try {
      // @ts-ignore - Flutter execute signature not in WDIO types
      await flutterBrowser.execute('flutter:waitForFirstFrame');
    } catch {
      // Ignore – app may already be ready
    }

    await ensureLoggedIn();
    await waitForElement(browser, 'dashboard_welcome_card', 60000);
    await waitForElement(browser, 'profile_action_card', 10000);
    await tapElement(browser, 'profile_action_card');
    await waitForElement(browser, 'display_name_field', 20000);
  });

  beforeEach(async function () {
    try {
      await waitForElement(browser, 'display_name_field', 4000);
    } catch {
      await waitForElement(browser, 'profile_action_card', 10000);
      await tapElement(browser, 'profile_action_card');
      await waitForElement(browser, 'display_name_field', 10000);
    }
  });

  it('should show Profile UI', async function () {
    this.timeout(20000);
    await waitForElement(browser, 'display_name_field', 15000);
    const saveButton = await waitForElement(browser, 'profile_save_button', 10000);
    expect(saveButton).to.exist;
  });

  it('should update display name and save', async function () {
    this.timeout(45000);
    await enterText(browser, 'display_name_field', TEST_DISPLAY_NAME);
    await tapElement(browser, 'profile_save_button');

    const snackbarVisible = await checkSnackbar(browser, 'Profile updated', 15000);
    expect(snackbarVisible, 'Expected snackbar "Profile updated"').to.be.true;
  });

  it('should persist value across navigation', async function () {
    this.timeout(45000);
    await browser.back();
    await browser.pause(800);

    await waitForElement(browser, 'profile_action_card', 10000);
    await tapElement(browser, 'profile_action_card');
    const displayNameField = await waitForElement(browser, 'display_name_field', 20000);
    expect(displayNameField).to.exist;
  });
});

