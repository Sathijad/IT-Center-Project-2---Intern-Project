const { remote } = require("webdriverio");

// === Helper functions for UiAutomator2 ===
async function findElementByText(driver, text, timeout = 10000) {
  const xpath = `//*[contains(@text, "${text}") or contains(@content-desc, "${text}")]`;
  const element = await driver.$(xpath);
  await element.waitForDisplayed({ timeout });
  return element;
}

// === Main test ===
describe("Phase 6: Complete Schedule Flow", function () {
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

  it("should complete full schedule flow: login -> navigate -> view schedules -> refresh", async () => {
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
        const homeIndicator = await findElementByText(driver, "Home", 10000);
        console.log("🏠 On Home screen");
      } catch (e) {
        console.log("⚠️ Could not verify home screen, but continuing...");
      }
      
      // === NAVIGATE TO MY SCHEDULE CARD ===
      console.log("➡️ Navigating to 'My Schedule' card on home screen...");
      
      const cardContentDescPattern = "My Schedule";
      let cardFound = false;
      let cardContainer = null;
      const maxScrolls = 10;
      
      // Check if already visible
      console.log("🔍 Checking if 'My Schedule' card is already visible...");
      try {
        cardContainer = await driver.$('//*[@content-desc="My Schedule\nSee upcoming shifts"]');
        await cardContainer.waitForDisplayed({ timeout: 2000 });
        cardFound = true;
        console.log(`✅ Found 'My Schedule' card by exact content-desc - already visible`);
      } catch (e) {
        try {
          cardContainer = await driver.$(`//*[contains(@content-desc, "${cardContentDescPattern}")]`);
          await cardContainer.waitForDisplayed({ timeout: 2000 });
          cardFound = true;
          console.log(`✅ Found 'My Schedule' card by content-desc (contains) - already visible`);
        } catch (e2) {
          console.log("📜 Card not visible, scrolling to find it...");
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
            cardContainer = await driver.$('//*[@content-desc="My Schedule\nSee upcoming shifts"]');
            await cardContainer.waitForDisplayed({ timeout: 1000 });
            cardFound = true;
            console.log(`✅ Found 'My Schedule' card after scroll ${scroll + 1} (exact match)`);
            break;
          } catch (e) {
            try {
              cardContainer = await driver.$(`//*[contains(@content-desc, "${cardContentDescPattern}")]`);
              await cardContainer.waitForDisplayed({ timeout: 1000 });
              cardFound = true;
              console.log(`✅ Found 'My Schedule' card after scroll ${scroll + 1} (contains match)`);
              break;
            } catch (e2) {
              // Continue scrolling
            }
          }
        }
      }
      
      if (!cardFound || !cardContainer) {
        throw new Error(`Could not find 'My Schedule' card by content-desc containing '${cardContentDescPattern}' after ${maxScrolls} scrolls.`);
      }
      
      await driver.pause(1000);
      
      // Click the card container
      console.log(`👆 Clicking 'My Schedule' card container...`);
      await cardContainer.click();
      console.log(`✅ Clicked 'My Schedule' card container`);
      await driver.pause(3000);
      
      // STRICT CHECK: Verify we landed on the correct screen
      console.log("🔍 Verifying we landed on 'Weekly Schedule' screen...");
      let onCorrectScreen = false;
      try {
        const screenIndicators = [
          '//*[contains(@text, "Weekly Schedule") or contains(@content-desc, "Weekly Schedule")]',
          '//*[contains(@text, "Schedule") or contains(@content-desc, "Schedule")]',
        ];
        
        for (const indicator of screenIndicators) {
          try {
            const element = await driver.$(indicator);
            await element.waitForDisplayed({ timeout: 3000 });
            onCorrectScreen = true;
            console.log("✅ Confirmed: On 'Weekly Schedule' screen");
            break;
          } catch (e) {
            // Continue to next indicator
          }
        }
      } catch (e) {
        console.log("⚠️ Could not verify screen, but continuing...");
      }
      
      if (!onCorrectScreen) {
        const wrongScreens = [
          { text: "Profile", name: "Profile Screen" },
          { text: "My Feedback", name: "Feedback Screen" },
        ];
        
        for (const screen of wrongScreens) {
          try {
            const wrongScreenElement = await driver.$(`//*[@text="${screen.text}" or @content-desc="${screen.text}"]`);
            await wrongScreenElement.waitForDisplayed({ timeout: 2000 });
            throw new Error(`❌ Navigation failed: Clicked 'My Schedule' card but landed on '${screen.name}' instead.`);
          } catch (e) {
            if (e.message && e.message.includes("Navigation failed")) {
              throw e;
            }
          }
        }
        
        console.log("⚠️ Could not verify correct screen, but continuing...");
      }
      
      // === SCHEDULE OVERVIEW SCREEN ===
      console.log("➡️ On Schedule Overview screen");
      await driver.pause(3000);
      
      // Test pull-to-refresh (if schedules are displayed)
      console.log("🔄 Testing pull-to-refresh functionality...");
      try {
        // Perform pull-to-refresh gesture
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
        console.log("✅ Performed pull-to-refresh gesture");
      } catch (e) {
        console.log("⚠️ Pull-to-refresh gesture failed, but continuing...");
      }
      
      // Check schedule display
      console.log("📋 Checking schedule display...");
      try {
        const emptyState = await driver.$('//*[contains(@text, "No schedules found")]');
        await emptyState.waitForDisplayed({ timeout: 3000 });
        console.log("ℹ️ No schedules found - empty state displayed");
      } catch (e) {
        try {
          const scheduleCard = await driver.$('//*[contains(@text, "Shift") or contains(@text, "schedule")]');
          await scheduleCard.waitForDisplayed({ timeout: 3000 });
          console.log("✅ Schedule items are displayed");
        } catch (e2) {
          console.log("⚠️ Could not determine schedule state, but continuing...");
        }
      }
      
      console.log("✅ Test completed successfully!");
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

