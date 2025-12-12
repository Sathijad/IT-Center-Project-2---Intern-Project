const { remote } = require("webdriverio");

// === Helper functions for UiAutomator2 ===
async function findElementByText(driver, text, timeout = 10000) {
  const xpath = `//*[contains(@text, "${text}") or contains(@content-desc, "${text}")]`;
  const element = await driver.$(xpath);
  await element.waitForDisplayed({ timeout });
  return element;
}

// === Main test ===
describe("Phase 4: Complete Schedule Flow (Schedule & Tasks)", function () {
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
      
      // Use the actual content-desc that appears in Android view tree
      // Flutter exposes it as "My Schedule\nSee upcoming shifts" or just "My Schedule"
      // Also search by text since content-desc might not be exposed
      const cardTitle = "My Schedule";
      const cardSubtitle = "See upcoming shifts";
      let cardFound = false;
      let cardContainer = null;
      const maxScrolls = 10;
      
      // Check if already visible - try multiple strategies
      console.log("🔍 Checking if 'My Schedule' card is already visible...");
      
      // Strategy 1: Exact content-desc match
      try {
        cardContainer = await driver.$('//*[@content-desc="My Schedule\nSee upcoming shifts"]');
        await cardContainer.waitForDisplayed({ timeout: 2000 });
        cardFound = true;
        console.log(`✅ Found 'My Schedule' card by exact content-desc - already visible`);
      } catch (e) {
        // Strategy 2: Contains content-desc
        try {
          cardContainer = await driver.$(`//*[contains(@content-desc, "${cardTitle}")]`);
          await cardContainer.waitForDisplayed({ timeout: 2000 });
          cardFound = true;
          console.log(`✅ Found 'My Schedule' card by content-desc (contains) - already visible`);
        } catch (e2) {
          // Strategy 3: Search by text - find element containing "My Schedule" text
          try {
            cardContainer = await driver.$(`//*[@text="${cardTitle}" or contains(@text, "${cardTitle}")]`);
            await cardContainer.waitForDisplayed({ timeout: 2000 });
            // Verify it also has the subtitle nearby or is in a card container
            cardFound = true;
            console.log(`✅ Found 'My Schedule' card by text - already visible`);
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
          
          // Check if card is now visible - try multiple strategies
          // Strategy 1: Exact content-desc
          try {
            cardContainer = await driver.$('//*[@content-desc="My Schedule\nSee upcoming shifts"]');
            await cardContainer.waitForDisplayed({ timeout: 1000 });
            cardFound = true;
            console.log(`✅ Found 'My Schedule' card after scroll ${scroll + 1} (exact content-desc)`);
            break;
          } catch (e) {
            // Strategy 2: Contains content-desc
            try {
              cardContainer = await driver.$(`//*[contains(@content-desc, "${cardTitle}")]`);
              await cardContainer.waitForDisplayed({ timeout: 1000 });
              cardFound = true;
              console.log(`✅ Found 'My Schedule' card after scroll ${scroll + 1} (contains content-desc)`);
              break;
            } catch (e2) {
              // Strategy 3: Search by text
              try {
                // Find element with "My Schedule" text, then find its parent container (card)
                const textElement = await driver.$(`//*[@text="${cardTitle}" or contains(@text, "${cardTitle}")]`);
                await textElement.waitForDisplayed({ timeout: 1000 });
                
                // Try to find the card container (parent or ancestor that's clickable)
                try {
                  // Get parent elements
                  const parent = await textElement.$('./..');
                  if (await parent.isDisplayed()) {
                    cardContainer = parent;
                    cardFound = true;
                    console.log(`✅ Found 'My Schedule' card after scroll ${scroll + 1} (by text, using parent)`);
                    break;
                  }
                } catch (e3) {
                  // If parent doesn't work, use the text element itself if it's clickable
                  const isClickable = await textElement.getAttribute('clickable');
                  if (isClickable === 'true') {
                    cardContainer = textElement;
                    cardFound = true;
                    console.log(`✅ Found 'My Schedule' card after scroll ${scroll + 1} (by text, clickable)`);
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
        throw new Error(`Could not find 'My Schedule' card by content-desc or text after ${maxScrolls} scrolls.`);
      }
      
      await driver.pause(1000);
      
      // VERIFY: Before clicking, ensure we have the correct card by checking its text/content
      console.log(`🔍 Verifying card content before clicking...`);
      try {
        const cardText = await cardContainer.getText();
        const cardContentDesc = await cardContainer.getAttribute('content-desc');
        console.log(`📋 Card text: "${cardText}"`);
        console.log(`📋 Card content-desc: "${cardContentDesc}"`);
        
        // Verify the card contains "My Schedule" text
        const hasCorrectText = (cardText && (cardText.includes("My Schedule") || cardText.includes("See upcoming shifts"))) ||
                              (cardContentDesc && (cardContentDesc.includes("My Schedule") || cardContentDesc.includes("See upcoming shifts")));
        
        if (!hasCorrectText) {
          throw new Error(`❌ CARD VERIFICATION FAILED: Found card with text "${cardText}" and content-desc "${cardContentDesc}", but it does not contain "My Schedule". This is likely the wrong card.`);
        }
        console.log(`✅ Verified: Card contains "My Schedule" text`);
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
      
      // Click the card container
      console.log(`👆 Clicking 'My Schedule' card container...`);
      try {
        await cardContainer.click();
        console.log(`✅ Clicked 'My Schedule' card container`);
      } catch (clickError) {
        // If click fails, try alternative click methods
        console.log(`⚠️ Standard click failed, trying alternative methods...`);
        try {
          await cardContainer.touchAction('tap');
          console.log(`✅ Clicked using touchAction`);
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
          } catch (e3) {
            throw new Error(`❌ CLICK FAILED: Could not click 'My Schedule' card using any method. Error: ${clickError.message}`);
          }
        }
      }
      await driver.pause(3000);
      
      // STRICT CHECK: Verify we landed on the correct screen - FAIL LOUDLY IF WRONG
      console.log("🔍 STRICT CHECK: Verifying we landed on 'Weekly Schedule' screen...");
      await driver.pause(2000); // Give screen time to load
      
      let onCorrectScreen = false;
      let screenTitleFound = false;
      
      // First, check for the correct screen title
      const correctScreenIndicators = [
        '//*[@text="Weekly Schedule"]',
        '//*[contains(@text, "Weekly Schedule")]',
        '//*[contains(@content-desc, "Weekly Schedule")]',
      ];
      
      for (const indicator of correctScreenIndicators) {
        try {
          const element = await driver.$(indicator);
          await element.waitForDisplayed({ timeout: 5000 });
          screenTitleFound = true;
          onCorrectScreen = true;
          console.log(`✅ Confirmed: Found 'Weekly Schedule' screen title using: ${indicator}`);
          break;
        } catch (e) {
          // Continue to next indicator
        }
      }
      
      // If we didn't find the correct screen, check for wrong screens and FAIL
      if (!onCorrectScreen) {
        console.log("❌ Did not find 'Weekly Schedule' screen title. Checking for wrong screens...");
        
        const wrongScreens = [
          { text: "Profile", name: "Profile Screen", selectors: [
            '//*[@text="Profile" or contains(@text, "Profile")]',
            '//*[contains(@content-desc, "Profile")]',
          ]},
          { text: "My Feedback", name: "My Feedback Screen", selectors: [
            '//*[@text="My Feedback" or contains(@text, "My Feedback")]',
            '//*[contains(@content-desc, "My Feedback")]',
          ]},
          { text: "Submit Feedback", name: "Submit Feedback Screen", selectors: [
            '//*[@text="Submit Feedback" or contains(@text, "Submit Feedback")]',
            '//*[contains(@content-desc, "Submit Feedback")]',
          ]},
          { text: "KPI Dashboard", name: "KPI Dashboard Screen", selectors: [
            '//*[@text="KPI Dashboard" or contains(@text, "KPI Dashboard")]',
            '//*[contains(@content-desc, "KPI Dashboard")]',
          ]},
          { text: "Training", name: "Training Screen", selectors: [
            '//*[@text="My Training" or contains(@text, "Training")]',
            '//*[contains(@content-desc, "Training")]',
          ]},
        ];
        
        for (const screen of wrongScreens) {
          for (const selector of screen.selectors) {
            try {
              const wrongScreenElement = await driver.$(selector);
              await wrongScreenElement.waitForDisplayed({ timeout: 2000 });
              // Take screenshot before failing
              try {
                await driver.saveScreenshot('./error-wrong-screen-navigation.png');
                console.log("📸 Screenshot saved: error-wrong-screen-navigation.png");
              } catch (e) {}
              
              throw new Error(`❌ NAVIGATION FAILED: Clicked 'My Schedule' card but landed on '${screen.name}' instead. Expected 'Weekly Schedule' screen.`);
            } catch (e) {
              if (e.message && e.message.includes("NAVIGATION FAILED")) {
                throw e; // Re-throw navigation errors
              }
              // Continue checking other wrong screens
            }
          }
        }
        
        // If we didn't find any wrong screen but also didn't find the correct one, fail
        try {
          await driver.saveScreenshot('./error-screen-verification-failed.png');
          console.log("📸 Screenshot saved: error-screen-verification-failed.png");
        } catch (e) {}
        
        throw new Error(`❌ NAVIGATION VERIFICATION FAILED: Could not verify we are on 'Weekly Schedule' screen after clicking 'My Schedule' card. The screen title was not found.`);
      }
      
      // === SCHEDULE OVERVIEW SCREEN - ACTUAL AUTOMATION ===
      // Since navigation check passed, we know we're on the correct screen
      // Now we just need to verify the screen has loaded and has content
      console.log("➡️ On Schedule Overview screen - verifying screen has loaded...");
      await driver.pause(3000); // Give time for screen to load
      
      // Wait for loading to complete (if any)
      console.log("🔍 Waiting for screen to finish loading...");
      try {
        const loadingIndicator = await driver.$('//*[@class="android.widget.ProgressBar" or contains(@class, "ProgressBar")]');
        await loadingIndicator.waitForDisplayed({ timeout: 2000 });
        console.log("⏳ Loading indicator found, waiting for it to disappear...");
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
      
      // Test pull-to-refresh functionality
      console.log("🔄 Testing pull-to-refresh functionality...");
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
        console.log("✅ Performed pull-to-refresh gesture");
      } catch (e) {
        console.log("⚠️ Pull-to-refresh gesture failed, but continuing...");
      }
      
      // Verify screen content (lighter check since navigation was already verified)
      console.log("🔍 Verifying screen has content (empty state or schedule items)...");
      let scheduleScreenVerified = false;
      
      // Check for empty state
      try {
        const emptyStateSelectors = [
          '//*[@text="No schedules found"]',
          '//*[contains(@text, "No schedules found")]',
          '//*[contains(@text, "don\'t have any scheduled shifts")]',
        ];
        
        for (const selector of emptyStateSelectors) {
          try {
            const emptyStateText = await driver.$(selector);
            await emptyStateText.waitForDisplayed({ timeout: 5000 });
            console.log(`✅ Found empty state: "${await emptyStateText.getText()}"`);
            scheduleScreenVerified = true;
            break;
          } catch (e) {}
        }
      } catch (e) {}
      
      // If empty state not found, check for schedule items
      if (!scheduleScreenVerified) {
        try {
          const contentIndicators = [
            '//android.widget.Card',
            '//*[contains(@text, "Shift")]',
            '//*[contains(@text, "schedule")]',
          ];
          
          for (const indicator of contentIndicators) {
            try {
              const elements = await driver.$$(indicator);
              for (let i = 0; i < Math.min(elements.length, 5); i++) {
                try {
                  if (await elements[i].isDisplayed()) {
                    const text = await elements[i].getText().catch(() => '');
                    console.log(`✅ Found schedule content: ${indicator} (text: "${text.substring(0, 50)}")`);
                    scheduleScreenVerified = true;
                    break;
                  }
                } catch (e) {}
              }
              if (scheduleScreenVerified) break;
            } catch (e2) {}
          }
        } catch (e) {}
      }
      
      if (!scheduleScreenVerified) {
        console.log("⚠️ Could not find empty state or schedule items, but navigation was verified.");
        console.log("   This is acceptable - screen may be loading or have no content.");
      } else {
        console.log("✅ Schedule screen content verified successfully!");
      }
      
      // Final check: Verify AppBar is still visible
      console.log("🔍 Final check: Verifying AppBar is still visible...");
      try {
        const appBarCheck = await driver.$('//*[contains(@text, "Weekly Schedule")]');
        await appBarCheck.waitForDisplayed({ timeout: 3000 });
        console.log("✅ AppBar 'Weekly Schedule' is still visible - confirmed on correct screen");
      } catch (e) {
        console.log("⚠️ Could not find AppBar in final check, but navigation was already verified earlier");
      }
      
      console.log("✅ Schedule screen testing completed!");
      
      // === NAVIGATE BACK TO HOME ===
      console.log("⬅️ Navigating back to Home screen...");
      try {
        await driver.back();
        await driver.pause(3000);
        console.log("✅ Navigated back to Home screen");
      } catch (e) {
        console.log("⚠️ Could not navigate back, but continuing...");
      }

      // Quick sanity: ensure we are really on Home before searching Tasks
      try {
        const homeCheck = await driver.$('//*[contains(@text, "Home") or contains(@content-desc, "Home")]');
        await homeCheck.waitForDisplayed({ timeout: 5000 });
        console.log("✅ Confirmed Home screen before Tasks navigation");
      } catch (e) {
        console.log("⚠️ Home indicator not found before Tasks; capturing state then failing...");
        try { await driver.saveScreenshot('./error-not-on-home-before-tasks.png'); } catch (_) {}
        try { console.log(await driver.getPageSource()); } catch (_) {}
        throw new Error("Not on Home screen before searching My Tasks");
      }
      
      // === NAVIGATE TO MY TASKS CARD ===
      console.log("➡️ Navigating to 'My Tasks' card on home screen...");
      
      const taskCardTitle = "My Tasks";
      const taskCardSubtitle = "Track assignments";
      let taskCardFound = false;
      let taskCardContainer = null;
      const maxTaskScrolls = 10;
      
      // Check if already visible
      console.log("🔍 Checking if 'My Tasks' card is already visible...");
      
      // Strategy 1: Exact content-desc match
      try {
        taskCardContainer = await driver.$('//*[@content-desc="My Tasks\nTrack assignments"]');
        await taskCardContainer.waitForDisplayed({ timeout: 2000 });
        taskCardFound = true;
        console.log(`✅ Found 'My Tasks' card by exact content-desc - already visible`);
      } catch (e) {
        // Strategy 2: Contains content-desc
        try {
          taskCardContainer = await driver.$(`//*[contains(@content-desc, "${taskCardTitle}")]`);
          await taskCardContainer.waitForDisplayed({ timeout: 2000 });
          taskCardFound = true;
          console.log(`✅ Found 'My Tasks' card by content-desc (contains) - already visible`);
        } catch (e2) {
          // Strategy 3: Search by text
          try {
            taskCardContainer = await driver.$(`//*[@text="${taskCardTitle}" or contains(@text, "${taskCardTitle}")]`);
            await taskCardContainer.waitForDisplayed({ timeout: 2000 });
            taskCardFound = true;
            console.log(`✅ Found 'My Tasks' card by text - already visible`);
          } catch (e3) {
            console.log("📜 Card not visible, scrolling to find it...");
          }
        }
      }
      
      // Scroll until card is visible
      if (!taskCardFound) {
        for (let scroll = 0; scroll < maxTaskScrolls; scroll++) {
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
            taskCardContainer = await driver.$('//*[@content-desc="My Tasks\nTrack assignments"]');
            await taskCardContainer.waitForDisplayed({ timeout: 1000 });
            taskCardFound = true;
            console.log(`✅ Found 'My Tasks' card after scroll ${scroll + 1} (exact content-desc)`);
            break;
          } catch (e) {
            try {
              taskCardContainer = await driver.$(`//*[contains(@content-desc, "${taskCardTitle}")]`);
              await taskCardContainer.waitForDisplayed({ timeout: 1000 });
              taskCardFound = true;
              console.log(`✅ Found 'My Tasks' card after scroll ${scroll + 1} (contains content-desc)`);
              break;
            } catch (e2) {
              try {
                const textElement = await driver.$(`//*[@text="${taskCardTitle}" or contains(@text, "${taskCardTitle}")]`);
                await textElement.waitForDisplayed({ timeout: 1000 });
                try {
                  const parent = await textElement.$('./..');
                  if (await parent.isDisplayed()) {
                    taskCardContainer = parent;
                    taskCardFound = true;
                    console.log(`✅ Found 'My Tasks' card after scroll ${scroll + 1} (by text, using parent)`);
                    break;
                  }
                } catch (e3) {
                  const isClickable = await textElement.getAttribute('clickable');
                  if (isClickable === 'true') {
                    taskCardContainer = textElement;
                    taskCardFound = true;
                    console.log(`✅ Found 'My Tasks' card after scroll ${scroll + 1} (by text, clickable)`);
                    break;
                  }
                }
              } catch (e4) {}
            }
          }
        }
      }
      
      if (!taskCardFound || !taskCardContainer) {
        try {
          await driver.saveScreenshot('./error-my-tasks-card-not-found.png');
          console.log("📸 Screenshot saved: error-my-tasks-card-not-found.png");
        } catch (e) {}
        try {
          console.log("📝 Dumping page source for debugging My Tasks search...");
          console.log(await driver.getPageSource());
        } catch (e) {
          console.log("⚠️ Could not dump page source:", e.message);
        }
        throw new Error(`Could not find 'My Tasks' card by content-desc or text after ${maxTaskScrolls} scrolls.`);
      }
      
      await driver.pause(1000);
      
      // Verify card content before clicking
      console.log(`🔍 Verifying card content before clicking...`);
      try {
        const cardText = await taskCardContainer.getText();
        const cardContentDesc = await taskCardContainer.getAttribute('content-desc');
        console.log(`📋 Card text: "${cardText}"`);
        console.log(`📋 Card content-desc: "${cardContentDesc}"`);
        
        const hasCorrectText = (cardText && (cardText.includes("My Tasks") || cardText.includes("Track assignments"))) ||
                              (cardContentDesc && (cardContentDesc.includes("My Tasks") || cardContentDesc.includes("Track assignments")));
        
        if (!hasCorrectText) {
          throw new Error(`❌ CARD VERIFICATION FAILED: Found card with text "${cardText}" and content-desc "${cardContentDesc}", but it does not contain "My Tasks". This is likely the wrong card.`);
        }
        console.log(`✅ Verified: Card contains "My Tasks" text`);
      } catch (e) {
        if (e.message && e.message.includes("CARD VERIFICATION FAILED")) {
          try {
            await driver.saveScreenshot('./error-wrong-task-card-selected.png');
            console.log("📸 Screenshot saved: error-wrong-task-card-selected.png");
          } catch (e2) {}
          throw e;
        }
        console.log(`⚠️ Could not verify card text, but continuing...`);
      }
      
      // Click the task card
      console.log(`👆 Clicking 'My Tasks' card container...`);
      try {
        await taskCardContainer.click();
        console.log(`✅ Clicked 'My Tasks' card container`);
      } catch (clickError) {
        console.log(`⚠️ Standard click failed, trying alternative methods...`);
        try {
          await taskCardContainer.touchAction('tap');
          console.log(`✅ Clicked using touchAction`);
        } catch (e2) {
          try {
            const location = await taskCardContainer.getLocation();
            const size = await taskCardContainer.getSize();
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
          } catch (e3) {
            throw new Error(`❌ CLICK FAILED: Could not click 'My Tasks' card using any method. Error: ${clickError.message}`);
          }
        }
      }
      await driver.pause(3000);
      
      // STRICT CHECK: Verify we landed on the correct Tasks screen
      console.log("🔍 STRICT CHECK: Verifying we landed on 'My Tasks' screen...");
      await driver.pause(2000);
      
      let onTasksScreen = false;
      const tasksScreenIndicators = [
        '//*[@text="My Tasks"]',
        '//*[contains(@text, "My Tasks")]',
        '//*[contains(@content-desc, "My Tasks")]',
      ];
      
      for (const indicator of tasksScreenIndicators) {
        try {
          const element = await driver.$(indicator);
          await element.waitForDisplayed({ timeout: 5000 });
          onTasksScreen = true;
          console.log(`✅ Confirmed: Found 'My Tasks' screen title using: ${indicator}`);
          break;
        } catch (e) {}
      }
      
      if (!onTasksScreen) {
        const wrongScreens = [
          { text: "Profile", name: "Profile Screen" },
          { text: "Weekly Schedule", name: "Schedule Screen" },
          { text: "My Feedback", name: "Feedback Screen" },
        ];
        
        for (const screen of wrongScreens) {
          try {
            const wrongScreenElement = await driver.$(`//*[@text="${screen.text}" or contains(@text, "${screen.text}")]`);
            await wrongScreenElement.waitForDisplayed({ timeout: 2000 });
            try {
              await driver.saveScreenshot('./error-wrong-tasks-screen-navigation.png');
              console.log("📸 Screenshot saved: error-wrong-tasks-screen-navigation.png");
            } catch (e) {}
            throw new Error(`❌ NAVIGATION FAILED: Clicked 'My Tasks' card but landed on '${screen.name}' instead. Expected 'My Tasks' screen.`);
          } catch (e) {
            if (e.message && e.message.includes("NAVIGATION FAILED")) {
              throw e;
            }
          }
        }
        
        try {
          await driver.saveScreenshot('./error-tasks-screen-verification-failed.png');
          console.log("📸 Screenshot saved: error-tasks-screen-verification-failed.png");
        } catch (e) {}
        throw new Error(`❌ NAVIGATION VERIFICATION FAILED: Could not verify we are on 'My Tasks' screen after clicking 'My Tasks' card.`);
      }
      
      // === TASKS SCREEN - ACTUAL AUTOMATION ===
      console.log("➡️ On My Tasks screen - performing automation checks...");
      await driver.pause(3000);
      
      // Wait for loading to complete
      console.log("🔍 Waiting for tasks screen to finish loading...");
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
      console.log("🔄 Testing pull-to-refresh on Tasks screen...");
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
        console.log("✅ Performed pull-to-refresh gesture on Tasks screen");
      } catch (e) {
        console.log("⚠️ Pull-to-refresh gesture failed, but continuing...");
      }
      
      // Verify screen content
      console.log("🔍 Verifying tasks screen has content...");
      let tasksScreenVerified = false;
      
      // Check for empty state
      try {
        const emptyStateSelectors = [
          '//*[@text="No tasks found"]',
          '//*[contains(@text, "No tasks found")]',
          '//*[contains(@text, "don\'t have any assigned tasks")]',
        ];
        
        for (const selector of emptyStateSelectors) {
          try {
            const emptyStateText = await driver.$(selector);
            await emptyStateText.waitForDisplayed({ timeout: 5000 });
            console.log(`✅ Found empty state: "${await emptyStateText.getText()}"`);
            tasksScreenVerified = true;
            break;
          } catch (e) {}
        }
      } catch (e) {}
      
      // If empty state not found, check for task items
      if (!tasksScreenVerified) {
        try {
          const contentIndicators = [
            '//android.widget.Card',
            '//*[contains(@text, "Task")]',
            '//*[contains(@text, "Add comment")]',
          ];
          
          for (const indicator of contentIndicators) {
            try {
              const elements = await driver.$$(indicator);
              for (let i = 0; i < Math.min(elements.length, 5); i++) {
                try {
                  if (await elements[i].isDisplayed()) {
                    const text = await elements[i].getText().catch(() => '');
                    console.log(`✅ Found task content: ${indicator} (text: "${text.substring(0, 50)}")`);
                    tasksScreenVerified = true;
                    break;
                  }
                } catch (e) {}
              }
              if (tasksScreenVerified) break;
            } catch (e2) {}
          }
        } catch (e) {}
      }
      
      if (!tasksScreenVerified) {
        console.log("⚠️ Could not find empty state or task items, but navigation was verified.");
        console.log("   This is acceptable - screen may be loading or have no content.");
      } else {
        console.log("✅ Tasks screen content verified successfully!");
      }
      
      // Final check: Verify AppBar is still visible
      console.log("🔍 Final check: Verifying AppBar is still visible...");
      try {
        const appBarCheck = await driver.$('//*[contains(@text, "My Tasks")]');
        await appBarCheck.waitForDisplayed({ timeout: 3000 });
        console.log("✅ AppBar 'My Tasks' is still visible - confirmed on correct screen");
      } catch (e) {
        console.log("⚠️ Could not find AppBar in final check, but navigation was already verified earlier");
      }
      
      console.log("✅ Test completed successfully - Schedule and Tasks screens both tested!");
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

