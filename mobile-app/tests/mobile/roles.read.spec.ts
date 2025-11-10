// import { before, beforeEach, describe, it } from 'mocha';
// import { browser, expect } from '@wdio/globals';
// import {
//   waitForElement,
//   tapElement,
//   enterText,
// } from '../../../appium-flutter-test/test/helpers/driver';

// const flutterBrowser = browser as unknown as any;
// const LOGIN_EMAIL = process.env.USER_EMAIL ?? 'admin@test.com';
// const LOGIN_PASSWORD = process.env.USER_PASSWORD ?? 'Admin@123';

// async function ensureOnDashboard() {
//   // Already on dashboard?
//   try {
//     await waitForElement(browser, 'dashboard_welcome_card', 5000);
//     return;
//   } catch {
//     // Maybe still on profile screen
//   }

//   try {
//     await waitForElement(browser, 'display_name_field', 3000);
//     await browser.back();
//     await browser.pause(800);
//     await waitForElement(browser, 'dashboard_welcome_card', 10000);
//     return;
//   } catch {
//     // Fall through to full sign-in flow
//   }

//   await waitForElement(browser, 'login_email', 20000);
//   await enterText(browser, 'login_email', LOGIN_EMAIL);
//   await enterText(browser, 'login_password', LOGIN_PASSWORD);
//   await tapElement(browser, 'sign_in_button');
//   await waitForElement(browser, 'dashboard_welcome_card', 60000);
// }

// async function openProfileScreen() {
//   await ensureOnDashboard();
//   await waitForElement(browser, 'profile_action_card', 30000);
//   await tapElement(browser, 'profile_action_card');
//   await waitForElement(browser, 'display_name_field', 20000);
// }

// describe('Mobile Roles Read', () => {
//   before(async function () {
//     this.timeout(120000);
//     try {
//       // @ts-ignore - Flutter execute signature not in WDIO types
//       await flutterBrowser.execute('flutter:waitForFirstFrame');
//     } catch {
//       // Ignore, context might already be ready
//     }

//     await openProfileScreen();
//   });

//   beforeEach(async function () {
//     try {
//       await waitForElement(browser, 'display_name_field', 3000);
//     } catch {
//       await openProfileScreen();
//     }
//   });

//   it('should open Profile to view roles', async function () {
//     this.timeout(30000);
//     await waitForElement(browser, 'profile_action_card', 10000);
//     await tapElement(browser, 'profile_action_card');
//     const displayNameField = await waitForElement(browser, 'display_name_field', 30000);
//     expect(displayNameField).toBeTruthy();
//   });

//   it('should display ADMIN or EMPLOYEE chip', async function () {
//     this.timeout(30000);
//     let roleFound = false;

//     try {
//       await waitForElement(browser, 'role_chip_ADMIN', 5000);
//       roleFound = true;
//     } catch {
//       // Ignore, try other role
//     }

//     if (!roleFound) {
//       try {
//         await waitForElement(browser, 'role_chip_EMPLOYEE', 5000);
//         roleFound = true;
//       } catch {
//         // Ignore – no predefined role chip found yet
//       }
//     }

//     expect(roleFound).toBe(true);
//   });

//   it('should verify roles expansion tile (optional)', async function () {
//     this.timeout(30000);

//     await browser.back();
//     await browser.pause(800);
//     await waitForElement(browser, 'dashboard_welcome_card', 10000);

//     try {
//       await waitForElement(browser, 'roles_expansion_tile', 10000);
//       await tapElement(browser, 'roles_expansion_tile');
//       await browser.pause(500);
//       const expansionTile = await waitForElement(browser, 'roles_expansion_tile', 5000);
//       expect(expansionTile).toBeTruthy();
//     } catch (err) {
//       console.log(
//         'Roles expansion tile not available or could not be expanded',
//         err instanceof Error ? err.message : err,
//       );
//     }
//   });
// });

