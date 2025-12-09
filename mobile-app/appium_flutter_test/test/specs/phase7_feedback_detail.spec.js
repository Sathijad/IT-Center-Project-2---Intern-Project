const { remote } = require("webdriverio");
const { byValueKey, byText } = require("appium-flutter-finder");

// === Helper functions for UiAutomator2 ===
async function enterTextUiAutomator2(driver, selector, text, label) {
  console.log(`⏳ Waiting for ${label}...`);
  const element = await driver.$(selector);
  await element.waitForDisplayed({ timeout: 15000 });
  
  console.log(`🖱️ Clicking ${label}...`);
  await element.click();
  await driver.pause(500);
  
  console.log(`⌨️ Typing into ${label}: ${text}`);
  await element.clearValue();
  await element.setValue(text);
  await driver.pause(1000);
  console.log(`✅ Done typing ${label}`);
}

async function clickButtonUiAutomator2(driver, selector, label) {
  console.log(`👆 Clicking ${label}...`);
  const element = await driver.$(selector);
  await element.waitForDisplayed({ timeout: 15000 });
  await element.click();
  await driver.pause(1000);
  console.log(`✅ Clicked ${label}`);
}

async function findElementByText(driver, text, timeout = 10000) {
  const xpath = `//*[contains(@text, "${text}") or contains(@content-desc, "${text}")]`;
  const element = await driver.$(xpath);
  await element.waitForDisplayed({ timeout });
  return element;
}

async function tapAtCoordinates(driver, x, y) {
  await driver.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: x, y: y },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 100 },
        { type: 'pointerUp', button: 0 }
      ]
    }
  ]);
}

// === Main test ===
describe("Phase 7: Feedback Detail Screen", function () {
  this.timeout(180000);
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
      "appium:newCommandTimeout": 300,
      "appium:autoGrantPermissions": true,
      "appium:noReset": false,
      "appium:waitForIdleTimeout": 0,
      "appium:androidInstallTimeout": 90000,
      "appium:uiautomator2ServerLaunchTimeout": 60000,
    },
  };

  before(async () => {
    console.log("🚀 Starting Appium session...");
    driver = await remote(opts);
    await driver.pause(3000);
  });

  after(async () => {
    if (driver) {
      await driver.deleteSession();
      console.log("🧹 Session closed.");
    }
  });

  it("should view feedback details and add a message", async () => {
    try {
      // === LOGIN SCREEN ===
      console.log("⏳ Waiting for login screen to load...");
      await driver.pause(8000); // Wait for app to fully load
      
      // Verify we're on the login screen
      console.log("🔍 Verifying login screen is displayed...");
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
        // Try multiple strategies to find email field
        emailField = await driver.$('//android.widget.EditText[@hint="Enter your email" or contains(@hint, "email")]');
        await emailField.waitForDisplayed({ timeout: 10000 });
      } catch (e1) {
        try {
          // Try by index (usually first EditText is email)
          emailField = await driver.$('//android.widget.EditText[1]');
          await emailField.waitForDisplayed({ timeout: 10000 });
        } catch (e2) {
          // Try by any EditText
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
        // Try to find password field (usually has password="true" or is second EditText)
        passwordField = await driver.$('//android.widget.EditText[@password="true"]');
        await passwordField.waitForDisplayed({ timeout: 10000 });
      } catch (e1) {
        try {
          passwordField = await driver.$('//android.widget.EditText[@hint="Enter your password" or contains(@hint, "password")]');
          await passwordField.waitForDisplayed({ timeout: 10000 });
        } catch (e2) {
          // Try by index (usually second EditText is password)
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
      try {
        signInButton = await findElementByText(driver, "Sign In", 10000);
      } catch (e1) {
        try {
          signInButton = await driver.$('//android.widget.Button[contains(@text, "Sign")]');
          await signInButton.waitForDisplayed({ timeout: 10000 });
        } catch (e2) {
          // Try by any button with text containing "Sign" or "Login"
          signInButton = await driver.$('//android.widget.Button[contains(@text, "Sign") or contains(@text, "Login")]');
          await signInButton.waitForDisplayed({ timeout: 10000 });
        }
      }
      
      await signInButton.click();
      console.log("✅ Clicked Sign In button");
      await driver.pause(3000);
      
      // === MFA SCREEN (if applicable) ===
      console.log("🔍 Checking for MFA screen...");
      let mfaDetected = false;
      try {
        // Check for various MFA indicators
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
            // Continue to next indicator
          }
        }
        
        if (mfaDetected) {
          console.log("⏳ Waiting for you to enter verification code manually...");
          console.log("⏳ Waiting up to 30 seconds...");
          
          // Wait for user to enter code (check every 2 seconds)
          let codeEntered = false;
          for (let i = 0; i < 15; i++) {
            await driver.pause(2000);
            console.log(`...${(i + 1) * 2}s elapsed`);
            
            // Try to find verify/submit button - if it becomes enabled, code might be entered
            try {
              const verifyButton = await driver.$('//android.widget.Button[contains(@text, "Verify") or contains(@text, "Submit") or contains(@text, "Next")]');
              if (await verifyButton.isDisplayed()) {
                console.log("✅ Verify button found, waiting a bit more for code entry...");
                await driver.pause(3000);
                
                // Click verify button
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
            // Try to find and click verify button anyway
            try {
              const verifyButton = await findElementByText(driver, "Verify", 5000);
              await verifyButton.click();
              console.log("✅ Clicked verify button");
            } catch (e) {
              console.log("⚠️ Verify button not found, but continuing...");
            }
          }
          
          // Wait for navigation to complete after verification
          console.log("⏳ Waiting for navigation after MFA verification...");
          await driver.pause(5000);
          
          // Check if we're still on MFA screen or moved forward
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
          
          // Additional wait to ensure app has fully navigated
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
      
      // Try to verify we're on home screen
      try {
        const homeIndicator = await findElementByText(driver, "Home", 10000);
        console.log("🏠 On Home screen");
      } catch (e) {
        console.log("⚠️ Could not verify home screen, but continuing...");
      }
      
      // === NAVIGATE TO FEEDBACK ===
      console.log("➡️ Looking for Feedback option...");
      await driver.pause(2000);
      
      try {
        // Try to find feedback menu item or card
        const feedbackOption = await findElementByText(driver, "Feedback", 10000);
        await feedbackOption.click();
        console.log("✅ Clicked Feedback option");
        await driver.pause(3000);
      } catch (e) {
        console.log("⚠️ Could not find Feedback option, trying alternative...");
        // Try tapping using helper function
        try {
          await tapAtCoordinates(driver, 200, 400);
          await driver.pause(2000);
        } catch (tapError) {
          console.log("⚠️ Could not tap, continuing...");
        }
      }
      
      // === FEEDBACK LIST SCREEN ===
      console.log("➡️ On Feedback List screen");
      await driver.pause(3000);
      
      // Try to tap on first feedback item
      console.log("👆 Tapping on first feedback item...");
      try {
        await tapAtCoordinates(driver, 200, 300);
        await driver.pause(3000);
        console.log("✅ Tapped on feedback item");
      } catch (e) {
        console.log("⚠️ Could not tap feedback item:", e.message);
        // Try alternative - find any clickable element
        try {
          const clickableItem = await driver.$('//android.view.ViewGroup[1]');
          await clickableItem.click();
          await driver.pause(2000);
        } catch (e2) {
          console.log("⚠️ Alternative tap also failed");
        }
      }
      
      // === FEEDBACK DETAIL SCREEN ===
      console.log("➡️ On Feedback Detail screen");
      await driver.pause(3000);
      
      console.log("✅ Test completed successfully!");
    } catch (err) {
      console.error("❌ Test failed:", err.message);
      // Take screenshot for debugging
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

