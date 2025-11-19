import { createDriver, waitForElement, tapElement, enterText, getText } from './driver';

/**
 * Login with email, password, and handle verification code manually
 * 
 * Flow:
 * 1. Enter email
 * 2. Enter password
 * 3. Tap Sign In
 * 4. Wait for verification code field
 * 5. Wait for user to manually enter code (90 seconds)
 * 6. Wait for dashboard to appear
 */
export async function loginWithVerificationCode(
  driver: WebdriverIO.Browser,
  email: string,
  password: string,
  waitForCodeTimeout: number = 90000
): Promise<void> {
  console.log('📱 Starting login flow...');
  
  // Step 1: Wait for login screen
  console.log('⏳ Waiting for login screen...');
  await waitForElement(driver, 'sign_in_button', 30000);
  
  // Step 2: Enter email
  console.log(`📧 Entering email: ${email}`);
  await waitForElement(driver, 'email_field', 10000);
  await enterText(driver, 'email_field', email);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 3: Enter password
  console.log('🔒 Entering password...');
  await waitForElement(driver, 'password_field', 10000);
  await enterText(driver, 'password_field', password);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 4: Tap Sign In button
  console.log('👉 Tapping Sign In button...');
  await waitForElement(driver, 'sign_in_button', 10000);
  await tapElement(driver, 'sign_in_button');
  
  // Step 5: Wait for either verification code field OR dashboard
  console.log('⏳ Waiting for verification code or dashboard...');
  const startTime = Date.now();
  let verificationCodeShown = false;
  
  while (Date.now() - startTime < waitForCodeTimeout) {
    try {
      // Check if verification code field appeared
      await waitForElement(driver, 'verification_code_field', 2000);
      verificationCodeShown = true;
      console.log('✅ Verification code field appeared!');
      break;
    } catch (e) {
      // Check if dashboard appeared (login succeeded without MFA)
      try {
        await waitForElement(driver, 'dashboard_welcome_card', 2000);
        console.log('✅ Dashboard appeared - login successful without verification code!');
        return; // Login successful
      } catch (e2) {
        // Neither appeared yet, continue waiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  if (!verificationCodeShown) {
    // Check if dashboard appeared during timeout
    try {
      await waitForElement(driver, 'dashboard_welcome_card', 5000);
      console.log('✅ Dashboard appeared - login successful!');
      return;
    } catch (e) {
      throw new Error('Timeout: Verification code field did not appear and dashboard not found');
    }
  }
  
  // Step 6: Wait for user to manually enter verification code and tap verify button
  console.log('⏸️  VERIFICATION CODE REQUIRED');
  console.log('   📧 Check your email/SMS for the verification code');
  console.log('   ⌨️  Enter the verification code in the app');
  console.log('   👆 Tap the "Verify Code" button (or press Enter)');
  console.log(`⏳ Waiting ${waitForCodeTimeout / 1000} seconds...`);
  
  // Wait for user to enter code and tap verify button
  // Monitor: verify button should be visible initially, then disappear after user taps it
  const verifyStartTime = Date.now();
  
  while (Date.now() - verifyStartTime < waitForCodeTimeout) {
    // Check if verify button still exists (user hasn't tapped yet)
    let buttonStillVisible = false;
    try {
      await waitForElement(driver, 'verify_code_button', 1000);
      buttonStillVisible = true;
    } catch (e) {
      // Button disappeared - user tapped it!
      buttonStillVisible = false;
      console.log('   ✅ "Verify Code" button was tapped - waiting for dashboard...');
    }
    
    if (!buttonStillVisible) {
      // Button was tapped, now wait for dashboard
      try {
        await waitForElement(driver, 'dashboard_welcome_card', 5000);
        console.log('✅ Dashboard appeared - verification successful! Login complete!');
        return;
      } catch (e) {
        // Dashboard not yet, keep waiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
    }
    
    // Button still visible - check if dashboard appeared anyway (user was fast!)
    try {
      await waitForElement(driver, 'dashboard_welcome_card', 1000);
      console.log('✅ Dashboard appeared - verification successful! Login complete!');
      return;
    } catch (e) {
      // Button visible, dashboard not yet - user still needs to enter code and tap
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Final check for dashboard
  try {
    await waitForElement(driver, 'dashboard_welcome_card', 5000);
    console.log('✅ Dashboard appeared - login complete!');
    return;
  } catch (e) {
    throw new Error('Timeout: Dashboard did not appear after verification. Did you tap the "Verify Code" button?');
  }
}

/**
 * Check if user is logged in by looking for dashboard
 */
export async function isLoggedIn(driver: WebdriverIO.Browser, timeout: number = 10000): Promise<boolean> {
  try {
    await waitForElement(driver, 'dashboard_welcome_card', timeout);
    return true;
  } catch (e) {
    return false;
  }
}

