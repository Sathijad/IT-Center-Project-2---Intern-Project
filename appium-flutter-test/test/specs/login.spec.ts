import { before, describe, it } from 'mocha';
import { browser, expect } from '@wdio/globals';
import {
  waitForElement,
  tapElement,
  enterText,
} from '../helpers/driver';

const LOGIN_EMAIL = process.env.USER_EMAIL ?? 'admin@test.com';
const LOGIN_PASSWORD = process.env.USER_PASSWORD ?? 'Admin@123';
const flutterBrowser = browser as unknown as any;

describe('Mobile Login Flow', () => {
before(async function () {
this.timeout(60000);
try {
      // @ts-ignore - Flutter execute signature not in WDIO types
      await flutterBrowser.execute('flutter:waitForFirstFrame');
} catch {
await browser.pause(2000);
}
});

it('should show login screen widgets', async function () {
this.timeout(30000);
await waitForElement(browser, 'login_email', 30000);
await waitForElement(browser, 'login_password', 10000);
await waitForElement(browser, 'sign_in_button', 10000);
});

it('should enter credentials and sign in', async function () {
  this.timeout(120000);

  if (
    !LOGIN_EMAIL ||
    LOGIN_EMAIL === 'REPLACE_WITH_EMAIL' ||
    !LOGIN_PASSWORD ||
    LOGIN_PASSWORD === 'REPLACE_WITH_PASSWORD'
  ) {
    throw new Error(
      'Set USER_EMAIL/USER_PASSWORD env vars or replace LOGIN_EMAIL/LOGIN_PASSWORD placeholders in login.spec.ts.',
    );
  }

  await enterText(browser, 'login_email', LOGIN_EMAIL);
  await enterText(browser, 'login_password', LOGIN_PASSWORD);
  await tapElement(browser, 'sign_in_button');

  const dashboardCard = await waitForElement(browser, 'dashboard_welcome_card', 60000);
  expect(dashboardCard).to.exist;
});

  it('should verify dashboard widget exists after login', async function () {
    this.timeout(60000);
    const dashboardCard = await waitForElement(browser, 'dashboard_welcome_card', 60000);
    expect(dashboardCard).to.exist;

    const profileCard = await waitForElement(browser, 'profile_action_card', 10000);
    expect(profileCard).to.exist;
  });
});

