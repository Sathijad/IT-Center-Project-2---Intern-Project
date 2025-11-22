import { WebDriver } from 'selenium-webdriver';
import { waitForPageLoad, getBaseUrl } from './test-base.js';
import { TEST_DATA } from './test-data.js';
import { LoginPage } from '../page-objects/LoginPage.js';
import { CognitoLoginPage } from '../page-objects/CognitoLoginPage.js';
import { DashboardPage } from '../page-objects/DashboardPage.js';

/**
 * Helper function to authenticate user before running tests
 * This function:
 * 1. Navigates to login page
 * 2. Enters email and password
 * 3. Clicks Sign In
 * 4. Waits for manual verification code entry
 * 5. Verifies successful login
 */
export async function authenticateUser(driver: WebDriver): Promise<void> {
  const loginPage = new LoginPage(driver);
  const cognitoLoginPage = new CognitoLoginPage(driver);
  const dashboardPage = new DashboardPage(driver);
  const baseUrl = getBaseUrl();

  console.log('\n========================================');
  console.log('🔐 AUTHENTICATION FLOW');
  console.log('========================================');
  console.log(`📍 Navigating to ${baseUrl}/login`);

  // Step 1: Navigate to login page
  await loginPage.open();
  await waitForPageLoad(driver);
  
  const isLoginVisible = await loginPage.isDisplayed();
  if (!isLoginVisible) {
    throw new Error('Login page is not displayed');
  }

  // Step 2: Click "Sign in with Cognito"
  console.log('🔐 Clicking "Sign in with Cognito" button...');
  await loginPage.clickSignInWithCognito();
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 3: Verify we're on Cognito login page
  const isOnCognito = await cognitoLoginPage.isOnCognitoPage();
  if (!isOnCognito) {
    throw new Error('Not redirected to Cognito login page');
  }
  
  await cognitoLoginPage.waitForPageLoad();
  console.log('✅ Cognito login page loaded');

  // Step 4: Enter email and click Next (goes to password field)
  console.log(`📧 Entering email: ${TEST_DATA.adminCredentials.email}`);
  await cognitoLoginPage.enterEmail(TEST_DATA.adminCredentials.email);
  console.log('✅ Clicked Next, waiting for password field...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for password field to appear

  // Step 5: Enter password and click Next (goes to verification code field)
  console.log('🔒 Entering password...');
  await cognitoLoginPage.enterPassword(TEST_DATA.adminCredentials.password);
  console.log('✅ Clicked Next, waiting for verification code field...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for verification field to appear

  // Step 7: Wait for verification code input (always wait, user will enter manually)
  console.log('⏳ Waiting for verification code input to appear...');
  const needsVerification = await cognitoLoginPage.waitForVerificationCodeInput();
  
  if (needsVerification) {
    console.log('\n========================================');
    console.log('📱 VERIFICATION CODE REQUIRED');
    console.log('========================================');
    console.log('Please manually enter the verification code in the browser window.');
    console.log('After entering the code and clicking Verify, the test will continue automatically.');
    console.log('========================================\n');
    await cognitoLoginPage.waitForManualVerificationCodeEntry(300);
  } else {
    console.log('✅ No verification code required. Waiting for redirect...');
    await cognitoLoginPage.waitForRedirectToApp(30);
  }

  // Step 8: Verify successful login and wait for app to load
  console.log('✅ Verification completed! Waiting for application to load...');
  await waitForPageLoad(driver);
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for app to fully load

  const currentUrl = await driver.getCurrentUrl();
  console.log(`📍 Current URL after login: ${currentUrl}`);
  
  const isRedirected = currentUrl.includes('/auth/callback') || 
                      (currentUrl.includes('localhost:5173') && !currentUrl.includes('cognito'));
  if (!isRedirected) {
    throw new Error('Not redirected back to application after login');
  }

  // Verify dashboard
  try {
    const isWelcomeVisible = await dashboardPage.isWelcomeMessageVisible();
    if (isWelcomeVisible) {
      console.log('✅ Successfully logged in and reached dashboard');
    }
  } catch (error) {
    console.log(`⚠️  Dashboard check: ${error}`);
    console.log('⚠️  Continuing with tests anyway...');
  }

  console.log('✅ Authentication complete! Ready to proceed with tests...\n');
}

