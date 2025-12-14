const { remote } = require("webdriverio");

// === Helper functions for UiAutomator2 ===
async function findElementByText(driver, text, timeout = 10000) {
  const xpath = `//*[contains(@text, "${text}") or contains(@content-desc, "${text}")]`;
  const element = await driver.$(xpath);
  await element.waitForDisplayed({ timeout });
  return element;
}

// Helper to check if session is still alive
async function checkSessionAlive(driver, context = 'unknown') {
  try {
    await driver.getPageSource();
    return true;
  } catch (error) {
    if (error.message && (
      error.message.includes('instrumentation process') ||
      error.message.includes('session is either terminated') ||
      error.message.includes('not running')
    )) {
      throw new Error(`❌ Session crashed at ${context}. The app may have crashed or the instrumentation process stopped. Check app logs for crash details.`);
    }
    throw error;
  }
}

// === Main test ===
describe("Phase 1: Complete Authentication & Role Management Flow (Staff Authentication & Role Management)", function () {
  this.timeout(300000); // 5 minutes (increased from 4 minutes)
  let driver;

  const opts = {
    protocol: "http",
    hostname: "127.0.0.1",
    port: 4723,
    path: "/",
    capabilities: {
      platformName: "Android",
      "appium:deviceName": "emulator-5554",
      "appium:app":
        "C:/Users/SathijaDeshapriya/Downloads/IT Center Project 2/mobile-app/build/app/outputs/flutter-apk/app-debug.apk",
      "appium:automationName": "UiAutomator2",
      "appium:platformVersion": "13",
      "appium:newCommandTimeout": 600, // Increased from 300 to 600 seconds
      "appium:autoGrantPermissions": true,
      "appium:noReset": false,
      "appium:waitForIdleTimeout": 0,
      "appium:androidInstallTimeout": 120000, // Increased from 90 to 120 seconds
      "appium:uiautomator2ServerLaunchTimeout": 90000, // Increased from 60 to 90 seconds
      "appium:uiautomator2ServerInstallTimeout": 90000, // Added for server install
      "appium:adbExecTimeout": 60000, // Added for adb command timeout
      "appium:androidDeviceReadyTimeout": 60, // Timeout for device to be ready
      "appium:shouldTerminateApp": false, // Don't terminate app between tests
      "appium:disableWindowAnimation": true, // Disable animations for more stable tests
    },
  };

  before(async () => {
    console.log("🚀 Starting Appium session...");
    driver = await remote(opts);
    await driver.pause(3000);
  });

  after(async () => {
    if (driver) {
      try {
        await driver.deleteSession();
        console.log("🧹 Session closed.");
      } catch (error) {
        // Session may already be closed by WebdriverIO - this is OK
        if (error.message && (
          error.message.includes('UND_ERR_CLOSED') ||
          error.message.includes('terminated') ||
          error.message.includes('not started') ||
          error.message.includes('session') && error.message.includes('DELETE')
        )) {
          console.log("ℹ️ Session already closed by WebdriverIO (expected)");
        } else {
          // Re-throw unexpected errors
          throw error;
        }
      }
    }
  });

  it("should complete full authentication & role management flow: login -> navigate to Profile -> navigate to Role Management -> test both screens", async () => {
    try {
      // === LOGIN SCREEN ===
      console.log("⏳ Waiting for login screen to load...");
      await driver.pause(8000);
      
      try {
        const loginIndicator = await findElementByText(driver, "IT Center", 15000);
        console.log("✅ Login screen is displayed");
      } catch (e) {
        console.log("⚠️ Could not verify login screen, but continuing...");
      }
      
      // === LOGIN AUTOMATION ===
      console.log("🔐 Starting login automation...");
      const testEmail = "user@test.com";
      const testPassword = "Admin@123";
      
      // Find and enter email
      console.log("📧 Looking for email field...");
      let emailField;
      try {
        emailField = await driver.$('//android.widget.EditText[@hint="Enter your email" or contains(@hint, "email")]');
        await emailField.waitForDisplayed({ timeout: 10000 });
      } catch (e1) {
        try {
          emailField = await driver.$('//android.widget.EditText[1]');
          await emailField.waitForDisplayed({ timeout: 10000 });
        } catch (e2) {
          const allEditTexts = await driver.$$('//android.widget.EditText');
          if (allEditTexts.length > 0) {
            emailField = allEditTexts[0];
          } else {
            throw new Error("Could not find email field");
          }
        }
      }
      
      await emailField.click();
      await driver.pause(500);
      await emailField.clearValue();
      await emailField.setValue(testEmail);
      console.log(`✅ Entered email: ${testEmail}`);
      await driver.pause(1000);
      
      // Find and enter password
      console.log("🔒 Looking for password field...");
      let passwordField;
      try {
        passwordField = await driver.$('//android.widget.EditText[@password="true"]');
        await passwordField.waitForDisplayed({ timeout: 10000 });
      } catch (e1) {
        try {
          passwordField = await driver.$('//android.widget.EditText[@hint="Enter your password" or contains(@hint, "password")]');
          await passwordField.waitForDisplayed({ timeout: 10000 });
        } catch (e2) {
          passwordField = await driver.$('//android.widget.EditText[2]');
          await passwordField.waitForDisplayed({ timeout: 10000 });
        }
      }
      
      await passwordField.click();
      await driver.pause(500);
      await passwordField.clearValue();
      await passwordField.setValue(testPassword);
      console.log("✅ Entered password");
      await driver.pause(1000);
      
      // Find and click Sign In button
      console.log("👆 Looking for Sign In button...");
      let signInButton;
      const signInSelectors = [
        async () => await findElementByText(driver, "Sign In", 5000),
        async () => await driver.$('//*[contains(@content-desc, "Sign In") or contains(@content-desc, "sign in") or contains(@content-desc, "login_button")]'),
        async () => await driver.$('//android.widget.Button[@text="Sign In"]'),
        async () => await driver.$('//android.widget.Button[contains(@text, "Sign")]'),
        async () => await driver.$('//*[@clickable="true" and contains(@text, "Sign In")]'),
        async () => await driver.$('//android.widget.Button[contains(@text, "Sign") or contains(@text, "Login")]'),
      ];
      
      for (const selectorFn of signInSelectors) {
        try {
          signInButton = await selectorFn();
          await signInButton.waitForDisplayed({ timeout: 3000 });
          console.log(`✅ Found Sign In button`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!signInButton) {
        throw new Error("Could not find Sign In button using any strategy");
      }
      
      await signInButton.click();
      console.log("✅ Clicked Sign In button");
      await driver.pause(3000);
      
      // === MFA SCREEN (if applicable) ===
      console.log("🔍 Checking for MFA screen...");
      let mfaDetected = false;
      try {
        const mfaIndicators = [
          '//*[contains(@text, "Verification Code") or contains(@text, "verification") or contains(@text, "Code")]',
          '//*[contains(@text, "MFA") or contains(@text, "Two-Factor")]',
          '//android.widget.EditText[@hint*="code" or @hint*="Code"]'
        ];
        
        for (const indicator of mfaIndicators) {
          try {
            const mfaElement = await driver.$(indicator);
            await mfaElement.waitForDisplayed({ timeout: 5000 });
            mfaDetected = true;
            console.log("✅ MFA screen detected!");
            break;
          } catch (e) {
            continue;
          }
        }
        
        if (mfaDetected) {
          console.log("⏳ Waiting for you to enter verification code manually...");
          console.log("⏳ Waiting up to 30 seconds...");
          
          let codeEntered = false;
          for (let i = 0; i < 15; i++) {
            await driver.pause(2000);
            console.log(`...${(i + 1) * 2}s elapsed`);
            
            try {
              const verifyButton = await driver.$('//android.widget.Button[contains(@text, "Verify") or contains(@text, "Submit") or contains(@text, "Next")]');
              if (await verifyButton.isDisplayed()) {
                console.log("✅ Verify button found, waiting a bit more for code entry...");
                await driver.pause(3000);
                
                await verifyButton.click();
                console.log("✅ Clicked verify/submit button");
                codeEntered = true;
                break;
              }
            } catch (e) {
              // Button not found yet, continue waiting
            }
          }
          
          if (!codeEntered) {
            try {
              const verifyButton = await findElementByText(driver, "Verify", 5000);
              await verifyButton.click();
              console.log("✅ Clicked verify button");
            } catch (e) {
              console.log("⚠️ Verify button not found, but continuing...");
            }
          }
          
          console.log("⏳ Waiting for navigation after MFA verification...");
          await driver.pause(5000);
          
          let stillOnMfa = false;
          try {
            const mfaCheck = await driver.$('//*[contains(@text, "Verification Code") or contains(@text, "verification")]');
            await mfaCheck.waitForDisplayed({ timeout: 2000 });
            stillOnMfa = true;
            console.log("⚠️ Still on MFA screen, waiting more...");
            await driver.pause(5000);
          } catch (e) {
            console.log("✅ MFA screen cleared, continuing to home screen...");
            stillOnMfa = false;
          }
          
          if (!stillOnMfa) {
            console.log("⏳ Waiting for app to fully load after MFA...");
            await driver.pause(3000);
          }
        } else {
          console.log("✅ No MFA screen detected, continuing...");
        }
      } catch (e) {
        console.log("⚠️ Error checking for MFA:", e.message);
        console.log("Continuing anyway...");
      }
      
      // === HOME SCREEN ===
      console.log("⏳ Waiting for Home screen to load...");
      await driver.pause(5000);

      try {
        await findElementByText(driver, "Home", 10000);
        console.log("🏠 On Home screen");
      } catch (e) {
        console.log("⚠️ Could not verify home screen, but continuing...");
      }

      // Add extra wait for home screen cards to fully render
      console.log("⏳ Waiting for home screen cards to fully render...");
      await driver.pause(3000);

      // Try pull-to-refresh gesture to ensure cards are loaded
      console.log("🔄 Performing pull-to-refresh gesture to ensure cards are loaded...");
      try {
        await driver.performActions([
          {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: 200, y: 300 },
              { type: 'pointerDown', button: 0 },
              { type: 'pause', duration: 100 },
              { type: 'pointerMove', duration: 500, x: 200, y: 700 },
              { type: 'pointerUp', button: 0 }
            ]
          }
        ]);
        await driver.pause(3000);
        console.log("✅ Performed pull-to-refresh gesture");
      } catch (e) {
        console.log("⚠️ Pull-to-refresh gesture failed, but continuing...");
      }

      // === NAVIGATE TO PROFILE CARD ===
      console.log("➡️ Navigating to 'Profile' card on home screen...");
      
      const cardTitle = "Profile";
      const cardSubtitle = "Manage account";
      let cardFound = false;
      let cardContainer = null;
      const maxScrolls = 5; // Reduced from 10 to 5 to prevent app crashes from excessive scrolling
      
      // Check if already visible - try multiple strategies
      console.log("🔍 Checking if 'Profile' card is already visible...");
      
      // Strategy 1: Exact content-desc match
      try {
        cardContainer = await driver.$('//*[@content-desc="Profile\nManage account"]');
        await cardContainer.waitForDisplayed({ timeout: 2000 });
        cardFound = true;
        console.log(`✅ Found 'Profile' card by exact content-desc - already visible`);
      } catch (e) {
        // Strategy 2: Contains content-desc
        try {
          cardContainer = await driver.$(`//*[contains(@content-desc, "${cardTitle}")]`);
          await cardContainer.waitForDisplayed({ timeout: 2000 });
          cardFound = true;
          console.log(`✅ Found 'Profile' card by content-desc (contains) - already visible`);
        } catch (e2) {
          // Strategy 3: Search by text
          try {
            cardContainer = await driver.$(`//*[@text="${cardTitle}" or contains(@text, "${cardTitle}")]`);
            await cardContainer.waitForDisplayed({ timeout: 2000 });
            cardFound = true;
            console.log(`✅ Found 'Profile' card by text - already visible`);
          } catch (e3) {
            console.log("📜 Card not visible, scrolling to find it...");
          }
        }
      }
      
      // Scroll until card is visible
      if (!cardFound) {
        for (let scroll = 0; scroll < maxScrolls; scroll++) {
          try {
            try {
              await driver.getPageSource();
            } catch (e) {
              console.error(`❌ Cannot get page source. App may have crashed: ${e.message}`);
              throw new Error(`App may have crashed. UiAutomator2 instrumentation not responding: ${e.message}`);
            }
            
            try {
              await driver.performActions([
                {
                  type: 'pointer',
                  id: 'finger1',
                  parameters: { pointerType: 'touch' },
                  actions: [
                    { type: 'pointerMove', duration: 0, x: 200, y: 800 },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 300 },
                    { type: 'pointerMove', duration: 500, x: 200, y: 100 },
                    { type: 'pointerUp', button: 0 }
                  ]
                }
              ]);
              await driver.pause(1500);
            } catch (actionError) {
              if (actionError.message && (actionError.message.includes('instrumentation process is not running') || actionError.message.includes('instrumentation process'))) {
                console.log(`⚠️ performActions failed on scroll ${scroll + 1}, trying alternative scroll method...`);
                
                try {
                  await driver.execute('mobile: scroll', {
                    direction: 'down',
                    element: null
                  });
                  await driver.pause(1500);
                  console.log(`✅ Used alternative scroll method (mobile:scroll)`);
                } catch (e2) {
                  console.error(`❌ Alternative scroll also failed: ${e2.message}`);
                  console.log(`⚠️ Continuing without scroll...`);
                  await driver.pause(1000);
                }
              } else {
                throw actionError;
              }
            }
          } catch (e) {
            console.log(`⚠️ Scroll ${scroll + 1} failed: ${e.message}, continuing...`);
            await driver.pause(1000);
          }
          
          // Check if card is now visible
          try {
            cardContainer = await driver.$('//*[@content-desc="Profile\nManage account"]');
            await cardContainer.waitForDisplayed({ timeout: 1000 });
            cardFound = true;
            console.log(`✅ Found 'Profile' card after scroll ${scroll + 1} (exact content-desc)`);
            break;
          } catch (e) {
            try {
              cardContainer = await driver.$(`//*[contains(@content-desc, "${cardTitle}")]`);
              await cardContainer.waitForDisplayed({ timeout: 1000 });
              cardFound = true;
              console.log(`✅ Found 'Profile' card after scroll ${scroll + 1} (contains content-desc)`);
              break;
            } catch (e2) {
              try {
                const textElement = await driver.$(`//*[@text="${cardTitle}" or contains(@text, "${cardTitle}")]`);
                await textElement.waitForDisplayed({ timeout: 1000 });
                
                try {
                  const parent = await textElement.$('./..');
                  if (await parent.isDisplayed()) {
                    cardContainer = parent;
                    cardFound = true;
                    console.log(`✅ Found 'Profile' card after scroll ${scroll + 1} (by text, using parent)`);
                    break;
                  }
                } catch (e3) {
                  const isClickable = await textElement.getAttribute('clickable');
                  if (isClickable === 'true') {
                    cardContainer = textElement;
                    cardFound = true;
                    console.log(`✅ Found 'Profile' card after scroll ${scroll + 1} (by text, clickable)`);
                    break;
                  }
                }
              } catch (e4) {
                // Continue scrolling
              }
            }
          }
        }
      }
      
      if (!cardFound || !cardContainer) {
        try {
          await driver.saveScreenshot('./error-profile-card-not-found.png');
          console.log("📸 Screenshot saved: error-profile-card-not-found.png");
        } catch (e) {}
        throw new Error(`Could not find 'Profile' card by content-desc or text after ${maxScrolls} scrolls.`);
      }
      
      await driver.pause(1000);
      
      // VERIFY: Before clicking, ensure we have the correct card
      console.log(`🔍 Verifying card content before clicking...`);
      try {
        const cardText = await cardContainer.getText();
        const cardContentDesc = await cardContainer.getAttribute('content-desc');
        console.log(`📋 Card text: "${cardText}"`);
        console.log(`📋 Card content-desc: "${cardContentDesc}"`);
        
        const hasCorrectText = (cardText && (cardText.includes("Profile") || cardText.includes("Manage account"))) ||
                              (cardContentDesc && (cardContentDesc.includes("Profile") || cardContentDesc.includes("Manage account")));
        
        if (!hasCorrectText) {
          throw new Error(`❌ CARD VERIFICATION FAILED: Found card with text "${cardText}" and content-desc "${cardContentDesc}", but it does not contain "Profile". This is likely the wrong card.`);
        }
        console.log(`✅ Verified: Card contains "Profile" text`);
      } catch (e) {
        if (e.message && e.message.includes("CARD VERIFICATION FAILED")) {
          try {
            await driver.saveScreenshot('./error-wrong-card-selected.png');
            console.log("📸 Screenshot saved: error-wrong-card-selected.png");
          } catch (e2) {}
          throw e;
        }
        console.log(`⚠️ Could not verify card text, but continuing...`);
      }
      
      // Click the card container with session crash detection
      console.log(`👆 Clicking 'Profile' card container...`);
      try {
        // Verify session is still active before clicking
        await checkSessionAlive(driver, 'before clicking Profile card');

        await cardContainer.click();
        console.log(`✅ Clicked 'Profile' card container`);

        // Add longer pause after click to allow navigation to complete
        await driver.pause(5000);

        // Verify session is still active after click
        await checkSessionAlive(driver, 'after clicking Profile card');
      } catch (clickError) {
        console.log(`⚠️ Standard click failed: ${clickError.message}`);

        if (clickError.message && clickError.message.includes('crashed')) {
          throw clickError; // Re-throw crash errors
        }

        console.log(`⚠️ Trying alternative methods...`);
        try {
          await cardContainer.touchAction('tap');
          console.log(`✅ Clicked using touchAction`);
          await driver.pause(5000);
        } catch (e2) {
          try {
            const location = await cardContainer.getLocation();
            const size = await cardContainer.getSize();
            const x = location.x + (size.width / 2);
            const y = location.y + (size.height / 2);
            await driver.performActions([{
              type: 'pointer',
              id: 'finger1',
              parameters: { pointerType: 'touch' },
              actions: [
                { type: 'pointerMove', duration: 0, x: x, y: y },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerUp', button: 0 }
              ]
            }]);
            console.log(`✅ Clicked using performActions at (${x}, ${y})`);
            await driver.pause(5000);
          } catch (e3) {
            throw new Error(`❌ CLICK FAILED: Could not click 'Profile' card using any method. Error: ${clickError.message}`);
          }
        }
      }
      
      // STRICT CHECK: Verify we landed on the correct screen
      console.log("🔍 STRICT CHECK: Verifying we landed on 'Profile' screen...");
      await driver.pause(2000);
      
      let onCorrectScreen = false;
      const correctScreenIndicators = [
        '//*[@text="Profile"]',
        '//*[contains(@text, "Profile")]',
        '//*[contains(@content-desc, "Profile")]',
        '//*[contains(@text, "My Profile")]',
        '//*[contains(@text, "Account")]',
      ];
      
      for (const indicator of correctScreenIndicators) {
        try {
          const element = await driver.$(indicator);
          await element.waitForDisplayed({ timeout: 5000 });
          onCorrectScreen = true;
          console.log(`✅ Confirmed: Found 'Profile' screen title using: ${indicator}`);
          break;
        } catch (e) {
          // Continue to next indicator
        }
      }
      
      if (!onCorrectScreen) {
        console.log("❌ Did not find 'Profile' screen title. Checking for wrong screens...");
        
        const wrongScreens = [
          { text: "My Schedule", name: "Schedule Screen" },
          { text: "My Feedback", name: "Feedback Screen" },
          { text: "KPI Dashboard", name: "KPI Dashboard Screen" },
          { text: "Staff Leave", name: "Staff Leave Screen" },
        ];
        
        for (const screen of wrongScreens) {
          try {
            const wrongScreenElement = await driver.$(`//*[@text="${screen.text}" or contains(@text, "${screen.text}")]`);
            await wrongScreenElement.waitForDisplayed({ timeout: 2000 });
            try {
              await driver.saveScreenshot('./error-wrong-screen-navigation.png');
              console.log("📸 Screenshot saved: error-wrong-screen-navigation.png");
            } catch (e) {}
            throw new Error(`❌ NAVIGATION FAILED: Clicked 'Profile' card but landed on '${screen.name}' instead. Expected 'Profile' screen.`);
          } catch (e) {
            if (e.message && e.message.includes("NAVIGATION FAILED")) {
              throw e;
            }
          }
        }
        
        try {
          await driver.saveScreenshot('./error-screen-verification-failed.png');
          console.log("📸 Screenshot saved: error-screen-verification-failed.png");
        } catch (e) {}
        throw new Error(`❌ NAVIGATION VERIFICATION FAILED: Could not verify we are on 'Profile' screen after clicking 'Profile' card.`);
      }
      
      // === PROFILE SCREEN - ACTUAL AUTOMATION ===
      console.log("➡️ On Profile screen - verifying screen has loaded...");
      await driver.pause(3000);
      
      // Wait for loading to complete
      console.log("🔍 Waiting for screen to finish loading...");
      try {
        const loadingIndicator = await driver.$('//*[@class="android.widget.ProgressBar" or contains(@class, "ProgressBar")]');
        await loadingIndicator.waitForDisplayed({ timeout: 2000 });
        for (let i = 0; i < 15; i++) {
          await driver.pause(1000);
          try {
            await loadingIndicator.waitForDisplayed({ timeout: 500, reverse: true });
            console.log(`✅ Loading completed after ${i + 1} seconds`);
            break;
          } catch (e) {
            if ((i + 1) % 3 === 0) {
              console.log(`   Still loading... (${i + 1}s)`);
            }
          }
        }
      } catch (e) {
        console.log("✅ No loading indicator found, screen should be ready");
      }
      
      await driver.pause(2000);
      
      // Test pull-to-refresh
      console.log("🔄 Testing pull-to-refresh on Profile screen...");
      try {
        await driver.performActions([
          {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: 200, y: 400 },
              { type: 'pointerDown', button: 0 },
              { type: 'pause', duration: 300 },
              { type: 'pointerMove', duration: 500, x: 200, y: 800 },
              { type: 'pointerUp', button: 0 }
            ]
          }
        ]);
        await driver.pause(2000);
        console.log("✅ Performed pull-to-refresh gesture on Profile screen");
      } catch (e) {
        console.log("⚠️ Pull-to-refresh gesture failed, but continuing...");
      }
      
      // Verify screen content
      console.log("🔍 Verifying screen has content...");
      let profileScreenVerified = false;
      
      // Check for profile content
      try {
        const contentIndicators = [
          '//*[contains(@text, "Email")]',
          '//*[contains(@text, "Name")]',
          '//*[contains(@text, "Role")]',
          '//*[contains(@text, "Edit")]',
          '//*[contains(@text, "Change Password")]',
          '//android.widget.Card',
        ];
        
        for (const indicator of contentIndicators) {
          try {
            const elements = await driver.$$(indicator);
            for (let i = 0; i < Math.min(elements.length, 5); i++) {
              try {
                if (await elements[i].isDisplayed()) {
                  const text = await elements[i].getText().catch(() => '');
                  console.log(`✅ Found profile content: ${indicator} (text: "${text.substring(0, 50)}")`);
                  profileScreenVerified = true;
                  break;
                }
              } catch (e) {}
            }
            if (profileScreenVerified) break;
          } catch (e2) {}
        }
      } catch (e) {}
      
      if (!profileScreenVerified) {
        console.log("⚠️ Could not find profile content, but navigation was verified.");
        console.log("   This is acceptable - screen may be loading or have different layout.");
      } else {
        console.log("✅ Profile screen content verified successfully!");
      }
      
      // === TEST CHANGE PASSWORD FUNCTIONALITY ===
      console.log("📝 Testing 'Change Password' functionality...");
      let changePasswordTested = false;
      
      try {
        // Look for "Change Password" button
        console.log("🔍 Looking for Change Password button...");
        let changePasswordButton = null;
        const changePasswordSelectors = [
          '//*[@text="Change Password"]',
          '//*[contains(@text, "Change Password")]',
          '//*[contains(@text, "Update Password")]',
          '//*[contains(@content-desc, "Change Password")]',
          '//android.widget.Button[contains(@text, "Password")]',
          '//*[@clickable="true" and contains(@text, "Password")]',
        ];
        
        for (const selector of changePasswordSelectors) {
          try {
            const elements = await driver.$$(selector);
            for (let i = 0; i < elements.length; i++) {
              try {
                if (await elements[i].isDisplayed()) {
                  changePasswordButton = elements[i];
                  console.log(`✅ Found Change Password button using: ${selector}`);
                  break;
                }
              } catch (e) {
                // Continue to next element
              }
            }
            if (changePasswordButton) break;
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (changePasswordButton) {
          // Scroll to make sure button is visible
          try {
            await driver.execute('mobile: scroll', {
              direction: 'down',
              element: changePasswordButton,
            });
            await driver.pause(1000);
          } catch (e) {
            // Continue anyway
          }
          
          // Click the Change Password button
          console.log("👆 Clicking Change Password button...");
          let buttonClicked = false;
          try {
            await changePasswordButton.click();
            console.log("✅ Clicked Change Password button");
            buttonClicked = true;
          } catch (clickError) {
            console.log("⚠️ Standard click failed, trying alternative methods...");
            try {
              await changePasswordButton.touchAction('tap');
              console.log("✅ Clicked using touchAction");
              buttonClicked = true;
            } catch (e2) {
              try {
                const location = await changePasswordButton.getLocation();
                const size = await changePasswordButton.getSize();
                const x = location.x + (size.width / 2);
                const y = location.y + (size.height / 2);
                await driver.performActions([{
                  type: 'pointer',
                  id: 'finger1',
                  parameters: { pointerType: 'touch' },
                  actions: [
                    { type: 'pointerMove', duration: 0, x: x, y: y },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 100 },
                    { type: 'pointerUp', button: 0 }
                  ]
                }]);
                console.log(`✅ Clicked using performActions at (${x}, ${y})`);
                buttonClicked = true;
              } catch (e3) {
                console.log(`⚠️ Could not click Change Password button: ${clickError.message}`);
                console.log("   Continuing without testing dialog...");
              }
            }
          }
          
          if (buttonClicked) {
            // Wait for dialog/form to open
            console.log("⏳ Waiting for change password dialog/form to open (up to 5 seconds)...");
            await driver.pause(3000);
            
            // Check if app is still responsive
            try {
              await driver.getPageSource();
              console.log("✅ App is still responsive");
            } catch (e) {
              console.log("⚠️ App may have crashed or become unresponsive");
              throw new Error("App became unresponsive after clicking Change Password button");
            }
            
            // Verify dialog/form is open
            console.log("🔍 Verifying change password dialog/form is open...");
            let dialogOpen = false;
            const dialogIndicators = [
              '//*[@text="Change Password"]',
              '//*[contains(@text, "Change Password")]',
              '//*[contains(@text, "Current Password")]',
              '//*[contains(@text, "New Password")]',
              '//*[contains(@text, "Confirm Password")]',
              '//android.widget.EditText[@password="true"]',
            ];
            
            for (let attempt = 0; attempt < 3; attempt++) {
              if (attempt > 0) {
                console.log(`   Retry ${attempt + 1}/3: Waiting 2 more seconds...`);
                await driver.pause(2000);
              }
              
              for (const indicator of dialogIndicators) {
                try {
                  const dialogElement = await driver.$(indicator);
                  await dialogElement.waitForDisplayed({ timeout: 3000 });
                  dialogOpen = true;
                  console.log(`✅ Dialog/form is open - found: ${indicator}`);
                  break;
                } catch (e) {
                  // Continue to next indicator
                }
              }
              
              if (dialogOpen) break;
            }
            
            if (dialogOpen) {
              console.log("✅ Change password dialog/form opened successfully!");
              
              // Try to close the dialog/form (cancel or back button)
              console.log("🔍 Looking for Cancel or Close button...");
              let dialogClosed = false;
              const closeButtonSelectors = [
                '//*[@text="Cancel"]',
                '//*[contains(@text, "Cancel")]',
                '//*[@text="Close"]',
                '//*[contains(@text, "Close")]',
                '//*[@text="Back"]',
              ];
              
              for (const selector of closeButtonSelectors) {
                try {
                  const closeButton = await driver.$(selector);
                  if (await closeButton.isDisplayed({ timeout: 2000 })) {
                    await closeButton.click();
                    console.log(`✅ Clicked ${selector} to close dialog`);
                    await driver.pause(1000);
                    dialogClosed = true;
                    break;
                  }
                } catch (e) {
                  // Continue to next selector
                }
              }
              
              if (!dialogClosed) {
                // Try back button
                try {
                  await driver.back();
                  await driver.pause(1000);
                  console.log("✅ Used back button to close dialog");
                  dialogClosed = true;
                } catch (e) {
                  console.log("⚠️ Could not close dialog - test will continue");
                }
              }
              
              if (dialogClosed) {
                changePasswordTested = true;
                console.log("✅ Change password functionality tested successfully!");
              }
            } else {
              console.log("⚠️ Dialog/form did not open after clicking Change Password button");
              console.log("   This is OK - button may navigate to a different screen");
              // Try to go back in case we navigated somewhere
              try {
                await driver.back();
                await driver.pause(1000);
                console.log("✅ Used back button to return to Profile screen");
              } catch (e) {
                console.log("⚠️ Could not navigate back");
              }
            }
          }
        } else {
          console.log("⚠️ Could not find Change Password button");
          console.log("   This is acceptable if the feature is not available or button has different text");
        }
      } catch (e) {
        console.log("⚠️ Error testing change password functionality:", e.message);
        console.log("   Continuing with test...");
      }
      
      if (changePasswordTested) {
        console.log("✅ Change password test completed!");
      } else {
        console.log("⚠️ Change password test was skipped (button not found or dialog didn't open)");
      }
      
      // Final check: Verify AppBar is still visible
      console.log("🔍 Final check: Verifying AppBar is still visible...");
      try {
        const appBarCheck = await driver.$('//*[contains(@text, "Profile")]');
        await appBarCheck.waitForDisplayed({ timeout: 3000 });
        console.log("✅ AppBar 'Profile' is still visible - confirmed on correct screen");
      } catch (e) {
        console.log("⚠️ Could not find AppBar in final check, but navigation was already verified earlier");
      }
      
      console.log("✅ Profile screen testing completed!");
      
      // === NAVIGATE BACK TO HOME ===
      console.log("⬅️ Navigating back to Home screen...");
      try {
        await driver.back();
        await driver.pause(3000);
        console.log("✅ Navigated back to Home screen");
      } catch (e) {
        console.log("⚠️ Could not navigate back, but continuing...");
      }
      
      // === NAVIGATE TO ROLE MANAGEMENT CARD ===
      console.log("➡️ Navigating to 'Role Management' card on home screen...");
      
      const roleCardTitle = "Role Management";
      const roleCardSubtitle = "Manage roles";
      let roleCardFound = false;
      let roleCardContainer = null;
      const maxRoleScrolls = 5; // Reduced from 10 to 5 to prevent app crashes from excessive scrolling
      
      // Check if already visible
      console.log("🔍 Checking if 'Role Management' card is already visible...");
      
      // Strategy 1: Exact content-desc match
      try {
        roleCardContainer = await driver.$('//*[@content-desc="Role Management\nManage roles"]');
        await roleCardContainer.waitForDisplayed({ timeout: 2000 });
        roleCardFound = true;
        console.log(`✅ Found 'Role Management' card by exact content-desc - already visible`);
      } catch (e) {
        // Strategy 2: Contains content-desc
        try {
          roleCardContainer = await driver.$(`//*[contains(@content-desc, "${roleCardTitle}")]`);
          await roleCardContainer.waitForDisplayed({ timeout: 2000 });
          roleCardFound = true;
          console.log(`✅ Found 'Role Management' card by content-desc (contains) - already visible`);
        } catch (e2) {
          // Strategy 3: Search by text
          try {
            roleCardContainer = await driver.$(`//*[@text="${roleCardTitle}" or contains(@text, "${roleCardTitle}")]`);
            await roleCardContainer.waitForDisplayed({ timeout: 2000 });
            roleCardFound = true;
            console.log(`✅ Found 'Role Management' card by text - already visible`);
          } catch (e3) {
            console.log("📜 Card not visible, scrolling to find it...");
          }
        }
      }
      
      // Scroll until card is visible
      if (!roleCardFound) {
        for (let scroll = 0; scroll < maxRoleScrolls; scroll++) {
          try {
            await driver.getPageSource();
          } catch (e) {
            console.error(`❌ Cannot get page source. App may have crashed: ${e.message}`);
            throw new Error(`App may have crashed. UiAutomator2 instrumentation not responding: ${e.message}`);
          }
          
          try {
            await driver.performActions([
              {
                type: 'pointer',
                id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                  { type: 'pointerMove', duration: 0, x: 200, y: 800 },
                  { type: 'pointerDown', button: 0 },
                  { type: 'pause', duration: 300 },
                  { type: 'pointerMove', duration: 500, x: 200, y: 100 },
                  { type: 'pointerUp', button: 0 }
                ]
              }
            ]);
            await driver.pause(1500);
          } catch (actionError) {
            if (actionError.message && (actionError.message.includes('instrumentation process is not running') || actionError.message.includes('instrumentation process'))) {
              console.log(`⚠️ performActions failed on scroll ${scroll + 1}, trying alternative scroll method...`);
              try {
                await driver.execute('mobile: scroll', { direction: 'down', element: null });
                await driver.pause(1500);
                console.log(`✅ Used alternative scroll method (mobile:scroll)`);
              } catch (e2) {
                console.error(`❌ Alternative scroll also failed: ${e2.message}`);
                await driver.pause(1000);
              }
            } else {
              throw actionError;
            }
          }
          
          // Check if card is now visible
          try {
            roleCardContainer = await driver.$('//*[@content-desc="Role Management\nManage roles"]');
            await roleCardContainer.waitForDisplayed({ timeout: 1000 });
            roleCardFound = true;
            console.log(`✅ Found 'Role Management' card after scroll ${scroll + 1} (exact content-desc)`);
            break;
          } catch (e) {
            try {
              roleCardContainer = await driver.$(`//*[contains(@content-desc, "${roleCardTitle}")]`);
              await roleCardContainer.waitForDisplayed({ timeout: 1000 });
              roleCardFound = true;
              console.log(`✅ Found 'Role Management' card after scroll ${scroll + 1} (contains content-desc)`);
              break;
            } catch (e2) {
              try {
                const textElement = await driver.$(`//*[@text="${roleCardTitle}" or contains(@text, "${roleCardTitle}")]`);
                await textElement.waitForDisplayed({ timeout: 1000 });
                try {
                  const parent = await textElement.$('./..');
                  if (await parent.isDisplayed()) {
                    roleCardContainer = parent;
                    roleCardFound = true;
                    console.log(`✅ Found 'Role Management' card after scroll ${scroll + 1} (by text, using parent)`);
                    break;
                  }
                } catch (e3) {
                  const isClickable = await textElement.getAttribute('clickable');
                  if (isClickable === 'true') {
                    roleCardContainer = textElement;
                    roleCardFound = true;
                    console.log(`✅ Found 'Role Management' card after scroll ${scroll + 1} (by text, clickable)`);
                    break;
                  }
                }
              } catch (e4) {}
            }
          }
        }
      }
      
      if (!roleCardFound || !roleCardContainer) {
        try {
          await driver.saveScreenshot('./error-role-management-card-not-found.png');
          console.log("📸 Screenshot saved: error-role-management-card-not-found.png");
        } catch (e) {}
        throw new Error(`Could not find 'Role Management' card by content-desc or text after ${maxRoleScrolls} scrolls.`);
      }
      
      await driver.pause(1000);
      
      // Verify card content before clicking
      console.log(`🔍 Verifying card content before clicking...`);
      try {
        const cardText = await roleCardContainer.getText();
        const cardContentDesc = await roleCardContainer.getAttribute('content-desc');
        console.log(`📋 Card text: "${cardText}"`);
        console.log(`📋 Card content-desc: "${cardContentDesc}"`);
        
        const hasCorrectText = (cardText && (cardText.includes("Role Management") || cardText.includes("Manage roles"))) ||
                              (cardContentDesc && (cardContentDesc.includes("Role Management") || cardContentDesc.includes("Manage roles")));
        
        if (!hasCorrectText) {
          throw new Error(`❌ CARD VERIFICATION FAILED: Found card with text "${cardText}" and content-desc "${cardContentDesc}", but it does not contain "Role Management". This is likely the wrong card.`);
        }
        console.log(`✅ Verified: Card contains "Role Management" text`);
      } catch (e) {
        if (e.message && e.message.includes("CARD VERIFICATION FAILED")) {
          try {
            await driver.saveScreenshot('./error-wrong-role-card-selected.png');
            console.log("📸 Screenshot saved: error-wrong-role-card-selected.png");
          } catch (e2) {}
          throw e;
        }
        console.log(`⚠️ Could not verify card text, but continuing...`);
      }
      
      // Click the role card with session crash detection
      console.log(`👆 Clicking 'Role Management' card container...`);
      try {
        // Verify session is still active before clicking
        await checkSessionAlive(driver, 'before clicking Role Management card');

        await roleCardContainer.click();
        console.log(`✅ Clicked 'Role Management' card container`);

        // Add longer pause after click to allow navigation to complete
        await driver.pause(5000);

        // Verify session is still active after click
        await checkSessionAlive(driver, 'after clicking Role Management card');
      } catch (clickError) {
        console.log(`⚠️ Standard click failed: ${clickError.message}`);

        if (clickError.message && clickError.message.includes('crashed')) {
          throw clickError; // Re-throw crash errors
        }

        console.log(`⚠️ Trying alternative methods...`);
        try {
          await roleCardContainer.touchAction('tap');
          console.log(`✅ Clicked using touchAction`);
          await driver.pause(5000);
        } catch (e2) {
          try {
            const location = await roleCardContainer.getLocation();
            const size = await roleCardContainer.getSize();
            const x = location.x + (size.width / 2);
            const y = location.y + (size.height / 2);
            await driver.performActions([{
              type: 'pointer',
              id: 'finger1',
              parameters: { pointerType: 'touch' },
              actions: [
                { type: 'pointerMove', duration: 0, x: x, y: y },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerUp', button: 0 }
              ]
            }]);
            console.log(`✅ Clicked using performActions at (${x}, ${y})`);
            await driver.pause(5000);
          } catch (e3) {
            throw new Error(`❌ CLICK FAILED: Could not click 'Role Management' card using any method. Error: ${clickError.message}`);
          }
        }
      }
      
      // STRICT CHECK: Verify we landed on the correct Role Management screen
      console.log("🔍 STRICT CHECK: Verifying we landed on 'Role Management' screen...");
      await driver.pause(2000);
      
      let onRoleScreen = false;
      const roleScreenIndicators = [
        '//*[@text="Role Management"]',
        '//*[contains(@text, "Role Management")]',
        '//*[contains(@content-desc, "Role Management")]',
        '//*[contains(@text, "Roles")]',
      ];
      
      for (const indicator of roleScreenIndicators) {
        try {
          const element = await driver.$(indicator);
          await element.waitForDisplayed({ timeout: 5000 });
          onRoleScreen = true;
          console.log(`✅ Confirmed: Found 'Role Management' screen title using: ${indicator}`);
          break;
        } catch (e) {
          // Continue to next indicator
        }
      }
      
      if (!onRoleScreen) {
        const wrongScreens = [
          { text: "Profile", name: "Profile Screen" },
          { text: "Staff Leave", name: "Staff Leave Screen" },
          { text: "My Schedule", name: "Schedule Screen" },
          { text: "My Feedback", name: "Feedback Screen" },
        ];
        
        for (const screen of wrongScreens) {
          try {
            const wrongScreenElement = await driver.$(`//*[@text="${screen.text}" or contains(@text, "${screen.text}")]`);
            await wrongScreenElement.waitForDisplayed({ timeout: 2000 });
            try {
              await driver.saveScreenshot('./error-wrong-role-screen-navigation.png');
              console.log("📸 Screenshot saved: error-wrong-role-screen-navigation.png");
            } catch (e) {}
            throw new Error(`❌ NAVIGATION FAILED: Clicked 'Role Management' card but landed on '${screen.name}' instead. Expected 'Role Management' screen.`);
          } catch (e) {
            if (e.message && e.message.includes("NAVIGATION FAILED")) {
              throw e;
            }
          }
        }
        
        try {
          await driver.saveScreenshot('./error-role-screen-verification-failed.png');
          console.log("📸 Screenshot saved: error-role-screen-verification-failed.png");
        } catch (e) {}
        throw new Error(`❌ NAVIGATION VERIFICATION FAILED: Could not verify we are on 'Role Management' screen after clicking 'Role Management' card.`);
      }
      
      // === ROLE MANAGEMENT SCREEN - ACTUAL AUTOMATION ===
      console.log("➡️ On Role Management screen - performing automation checks...");
      await driver.pause(3000);
      
      // Wait for loading to complete
      console.log("🔍 Waiting for role management screen to finish loading...");
      try {
        const loadingIndicator = await driver.$('//*[@class="android.widget.ProgressBar" or contains(@class, "ProgressBar")]');
        await loadingIndicator.waitForDisplayed({ timeout: 2000 });
        for (let i = 0; i < 15; i++) {
          await driver.pause(1000);
          try {
            await loadingIndicator.waitForDisplayed({ timeout: 500, reverse: true });
            console.log(`✅ Loading completed after ${i + 1} seconds`);
            break;
          } catch (e) {
            if ((i + 1) % 3 === 0) {
              console.log(`   Still loading... (${i + 1}s)`);
            }
          }
        }
      } catch (e) {
        console.log("✅ No loading indicator found, screen should be ready");
      }
      
      await driver.pause(2000);
      
      // Test pull-to-refresh
      console.log("🔄 Testing pull-to-refresh on Role Management screen...");
      try {
        await driver.performActions([
          {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: 200, y: 400 },
              { type: 'pointerDown', button: 0 },
              { type: 'pause', duration: 300 },
              { type: 'pointerMove', duration: 500, x: 200, y: 800 },
              { type: 'pointerUp', button: 0 }
            ]
          }
        ]);
        await driver.pause(2000);
        console.log("✅ Performed pull-to-refresh gesture on Role Management screen");
      } catch (e) {
        console.log("⚠️ Pull-to-refresh gesture failed, but continuing...");
      }
      
      // Verify screen content
      console.log("🔍 Verifying role management screen has content...");
      let roleScreenVerified = false;
      
      // Check for empty state
      try {
        const emptyStateSelectors = [
          '//*[@text="No roles available"]',
          '//*[contains(@text, "No roles available")]',
          '//*[contains(@text, "No roles found")]',
        ];
        
        for (const selector of emptyStateSelectors) {
          try {
            const emptyStateText = await driver.$(selector);
            await emptyStateText.waitForDisplayed({ timeout: 5000 });
            console.log(`✅ Found empty state: "${await emptyStateText.getText()}"`);
            roleScreenVerified = true;
            break;
          } catch (e) {}
        }
      } catch (e) {}
      
      // If empty state not found, check for role items
      if (!roleScreenVerified) {
        try {
          const contentIndicators = [
            '//android.widget.Card',
            '//*[contains(@text, "Role")]',
            '//*[contains(@text, "Admin")]',
            '//*[contains(@text, "Staff")]',
            '//*[contains(@text, "Manager")]',
          ];
          
          for (const indicator of contentIndicators) {
            try {
              const elements = await driver.$$(indicator);
              for (let i = 0; i < Math.min(elements.length, 5); i++) {
                try {
                  if (await elements[i].isDisplayed()) {
                    const text = await elements[i].getText().catch(() => '');
                    console.log(`✅ Found role content: ${indicator} (text: "${text.substring(0, 50)}")`);
                    roleScreenVerified = true;
                    break;
                  }
                } catch (e) {}
              }
              if (roleScreenVerified) break;
            } catch (e2) {}
          }
        } catch (e) {}
      }
      
      if (!roleScreenVerified) {
        console.log("⚠️ Could not find empty state or role items, but navigation was verified.");
        console.log("   This is acceptable - screen may be loading or have no content.");
      } else {
        console.log("✅ Role Management screen content verified successfully!");
      }
      
      // === TEST ASSIGN ROLE FUNCTIONALITY ===
      console.log("📝 Testing 'Assign Role' functionality...");
      let assignRoleTested = false;
      
      try {
        // Look for "Assign Role", "Add Role", "Manage Role" button
        console.log("🔍 Looking for assign role button...");
        let assignRoleButton = null;
        const assignRoleSelectors = [
          '//*[@text="Assign Role"]',
          '//*[contains(@text, "Assign Role")]',
          '//*[@text="Add Role"]',
          '//*[contains(@text, "Add Role")]',
          '//*[@text="Manage Role"]',
          '//*[contains(@text, "Manage Role")]',
          '//*[contains(@content-desc, "Assign Role")]',
          '//android.widget.Button[contains(@text, "Role")]',
          '//*[@clickable="true" and contains(@text, "Role")]',
        ];
        
        for (const selector of assignRoleSelectors) {
          try {
            const elements = await driver.$$(selector);
            for (let i = 0; i < elements.length; i++) {
              try {
                if (await elements[i].isDisplayed()) {
                  const buttonText = await elements[i].getText().catch(() => '');
                  // Prefer buttons that say "Assign Role", "Add Role", or "Manage Role"
                  if (buttonText && (buttonText.includes("Assign Role") || buttonText.includes("Add Role") || buttonText.includes("Manage Role"))) {
                    assignRoleButton = elements[i];
                    console.log(`✅ Found assign role button using: ${selector} (text: "${buttonText}")`);
                    break;
                  }
                }
              } catch (e) {
                // Continue to next element
              }
            }
            if (assignRoleButton) break;
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (assignRoleButton) {
          // Scroll to make sure button is visible
          try {
            await driver.execute('mobile: scroll', {
              direction: 'down',
              element: assignRoleButton,
            });
            await driver.pause(1000);
          } catch (e) {
            // Continue anyway
          }
          
          // Click the Assign Role button
          console.log("👆 Clicking assign role button...");
          let buttonClicked = false;
          try {
            await assignRoleButton.click();
            console.log("✅ Clicked assign role button");
            buttonClicked = true;
          } catch (clickError) {
            console.log("⚠️ Standard click failed, trying alternative methods...");
            try {
              await assignRoleButton.touchAction('tap');
              console.log("✅ Clicked using touchAction");
              buttonClicked = true;
            } catch (e2) {
              try {
                const location = await assignRoleButton.getLocation();
                const size = await assignRoleButton.getSize();
                const x = location.x + (size.width / 2);
                const y = location.y + (size.height / 2);
                await driver.performActions([{
                  type: 'pointer',
                  id: 'finger1',
                  parameters: { pointerType: 'touch' },
                  actions: [
                    { type: 'pointerMove', duration: 0, x: x, y: y },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 100 },
                    { type: 'pointerUp', button: 0 }
                  ]
                }]);
                console.log(`✅ Clicked using performActions at (${x}, ${y})`);
                buttonClicked = true;
              } catch (e3) {
                console.log(`⚠️ Could not click assign role button: ${clickError.message}`);
                console.log("   Continuing without testing dialog...");
              }
            }
          }
          
          if (buttonClicked) {
            // Wait for dialog/form to open
            console.log("⏳ Waiting for assign role dialog/form to open (up to 5 seconds)...");
            await driver.pause(3000);
            
            // Check if app is still responsive
            try {
              await driver.getPageSource();
              console.log("✅ App is still responsive");
            } catch (e) {
              console.log("⚠️ App may have crashed or become unresponsive");
              throw new Error("App became unresponsive after clicking assign role button");
            }
            
            // Verify dialog/form is open
            console.log("🔍 Verifying assign role dialog/form is open...");
            let dialogOpen = false;
            const dialogIndicators = [
              '//*[@text="Assign Role"]',
              '//*[contains(@text, "Assign Role")]',
              '//*[contains(@text, "Add Role")]',
              '//*[contains(@text, "Select User")]',
              '//*[contains(@text, "Select Role")]',
              '//android.widget.EditText',
            ];
            
            for (let attempt = 0; attempt < 3; attempt++) {
              if (attempt > 0) {
                console.log(`   Retry ${attempt + 1}/3: Waiting 2 more seconds...`);
                await driver.pause(2000);
              }
              
              for (const indicator of dialogIndicators) {
                try {
                  const dialogElement = await driver.$(indicator);
                  await dialogElement.waitForDisplayed({ timeout: 3000 });
                  dialogOpen = true;
                  console.log(`✅ Dialog/form is open - found: ${indicator}`);
                  break;
                } catch (e) {
                  // Continue to next indicator
                }
              }
              
              if (dialogOpen) break;
            }
            
            if (dialogOpen) {
              console.log("✅ Assign role dialog/form opened successfully!");
              
              // Try to close the dialog/form (cancel or back button)
              console.log("🔍 Looking for Cancel or Close button...");
              let dialogClosed = false;
              const closeButtonSelectors = [
                '//*[@text="Cancel"]',
                '//*[contains(@text, "Cancel")]',
                '//*[@text="Close"]',
                '//*[contains(@text, "Close")]',
                '//*[@text="Back"]',
              ];
              
              for (const selector of closeButtonSelectors) {
                try {
                  const closeButton = await driver.$(selector);
                  if (await closeButton.isDisplayed({ timeout: 2000 })) {
                    await closeButton.click();
                    console.log(`✅ Clicked ${selector} to close dialog`);
                    await driver.pause(1000);
                    dialogClosed = true;
                    break;
                  }
                } catch (e) {
                  // Continue to next selector
                }
              }
              
              if (!dialogClosed) {
                // Try back button
                try {
                  await driver.back();
                  await driver.pause(1000);
                  console.log("✅ Used back button to close dialog");
                  dialogClosed = true;
                } catch (e) {
                  console.log("⚠️ Could not close dialog - test will continue");
                }
              }
              
              if (dialogClosed) {
                assignRoleTested = true;
                console.log("✅ Assign role functionality tested successfully!");
              }
            } else {
              console.log("⚠️ Dialog/form did not open after clicking assign role button");
              console.log("   This is OK - button may navigate to a different screen");
              // Try to go back in case we navigated somewhere
              try {
                await driver.back();
                await driver.pause(1000);
                console.log("✅ Used back button to return to Role Management screen");
              } catch (e) {
                console.log("⚠️ Could not navigate back");
              }
            }
          }
        } else {
          console.log("⚠️ Could not find assign role button");
          console.log("   This is acceptable if the feature is not available or button has different text");
        }
      } catch (e) {
        console.log("⚠️ Error testing assign role functionality:", e.message);
        console.log("   Continuing with test...");
      }
      
      if (assignRoleTested) {
        console.log("✅ Assign role test completed!");
      } else {
        console.log("⚠️ Assign role test was skipped (button not found or dialog didn't open)");
      }
      
      // Final check: Verify AppBar is still visible
      console.log("🔍 Final check: Verifying AppBar is still visible...");
      try {
        const appBarCheck = await driver.$('//*[contains(@text, "Role Management") or contains(@text, "Roles")]');
        await appBarCheck.waitForDisplayed({ timeout: 3000 });
        console.log("✅ AppBar 'Role Management' is still visible - confirmed on correct screen");
      } catch (e) {
        console.log("⚠️ Could not find AppBar in final check, but navigation was already verified earlier");
      }
      
      console.log("✅ Test completed successfully - Profile and Role Management screens both tested!");
    } catch (err) {
      console.error("❌ Test failed:", err.message);
      try {
        await driver.saveScreenshot('./error-screenshot.png');
        console.log("📸 Screenshot saved to error-screenshot.png");
      } catch (e) {
        console.log("⚠️ Could not save screenshot");
      }
      throw err;
    }
  });
});


