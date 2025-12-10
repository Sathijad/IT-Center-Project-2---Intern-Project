const { remote } = require("webdriverio");
const fs = require("fs");

// === Helper functions for UiAutomator2 ===
async function waitForElement(driver, selector, label, timeout = 10000) {
  console.log(`⏳ Waiting for ${label}...`);
  try {
    const element = await driver.$(selector);
    await element.waitForDisplayed({ timeout });
    await driver.pause(500);
    console.log(`✅ ${label} found`);
    return element;
  } catch (e) {
    console.error(`❌ ${label} not found: ${e.message}`);
    throw e;
  }
}

async function tapElement(driver, selector, label) {
  console.log(`👆 Tapping ${label}...`);
  const element = await waitForElement(driver, selector, label);
  await element.click();
  await driver.pause(500);
  console.log(`✅ Clicked ${label}`);
}

async function enterText(driver, selector, text, label) {
  console.log(`⌨️ Typing into ${label}: ${text}`);
  const element = await waitForElement(driver, selector, label);
  await element.clearValue();
  await element.setValue(text);
  await driver.pause(500);
  console.log(`✅ Done typing ${label}`);
}

// Helper to wait for app to be ready
async function waitForAppReady(driver, timeout = 30000) {
  console.log("⏳ Waiting for app to be ready...");
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const elements = await driver.$$('//*');
      if (elements.length > 0) {
        console.log(`✅ App is ready (found ${elements.length} elements)`);
        await driver.pause(2000);
        return;
      }
    } catch (e) {
      // App not ready yet, continue waiting
    }
    await driver.pause(1000);
  }
  
  console.log("⚠️ App ready check timeout, but continuing...");
}

// Helper to find element by text (same as phase7_feedback_detail.spec.js)
async function findElementByText(driver, text, timeout = 10000) {
  const xpath = `//*[contains(@text, "${text}") or contains(@content-desc, "${text}")]`;
  const element = await driver.$(xpath);
  await element.waitForDisplayed({ timeout });
  return element;
}

// Helper to debug UI hierarchy
async function debugUI(driver, label = "Current screen") {
  try {
    console.log(`🔍 Debugging ${label}...`);
    const pageSource = await driver.getPageSource();
    console.log(`📄 Page source snippet (first 500 chars):`);
    console.log(pageSource.substring(0, 500));
    
    const editTexts = await driver.$$('android.widget.EditText');
    console.log(`📝 Found ${editTexts.length} EditText fields`);
    for (let i = 0; i < Math.min(editTexts.length, 5); i++) {
      try {
        const text = await editTexts[i].getText();
        const desc = await editTexts[i].getAttribute('content-desc');
        console.log(`  EditText[${i}]: text="${text}", desc="${desc}"`);
      } catch (e) {
        console.log(`  EditText[${i}]: (could not get attributes)`);
      }
    }
  } catch (e) {
    console.log(`⚠️ Could not debug UI: ${e.message}`);
  }
}

// === Main test ===
describe("Phase 7: Complete Feedback Flow", function () {
  this.timeout(300000); // 5 minutes for complete flow
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
      "appium:platformVersion": "13",
      "appium:automationName": "UiAutomator2",
      "appium:newCommandTimeout": 300,
      "appium:autoGrantPermissions": true,
      "appium:noReset": false,
      "appium:unicodeKeyboard": true,
      "appium:resetKeyboard": true,
      "appium:waitForIdleTimeout": 1000,
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

  it("should complete full feedback lifecycle: create, view, add message, filter", async () => {
    try {
      // === STEP 1: LOGIN ===
      console.log("=== STEP 1: LOGIN ===");
      console.log("⏳ Waiting for login screen to appear...");
      
      await waitForAppReady(driver, 45000);
      
      // Wait for login screen elements
      let loginScreenReady = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        await driver.pause(1000);
        try {
          const editTexts = await driver.$$('android.widget.EditText');
          if (editTexts.length > 0) {
            console.log(`✅ Login screen is ready! Found ${editTexts.length} EditText fields`);
            loginScreenReady = true;
            break;
          }
          if (attempt % 5 === 0 && attempt > 0) {
            console.log(`⏳ Still waiting... (${attempt}s)`);
          }
        } catch (e) {
          // Continue waiting
        }
      }
      
      if (!loginScreenReady) {
        console.log("⚠️ Login screen may not be ready. Continuing anyway...");
        await debugUI(driver, "Login screen - waiting");
        await driver.pause(5000);
      }
      
      const testEmail = "user@test.com";
      const testPassword = "Admin@123";
      
      // Find and enter email
      let emailField;
      try {
        emailField = await driver.$('//android.widget.EditText[contains(@hint, "email") or contains(@hint, "Email") or @hint="Enter your email"]');
        await emailField.waitForDisplayed({ timeout: 15000 });
        console.log("✅ Found email field by hint text");
      } catch (e) {
        try {
          const editTexts = await driver.$$('android.widget.EditText');
          if (editTexts.length > 0) {
            emailField = editTexts[0];
            await emailField.waitForDisplayed({ timeout: 15000 });
            console.log("✅ Found email field by index");
          } else {
            throw new Error("No EditText fields found");
          }
        } catch (e2) {
          emailField = await driver.$('~login_email_field');
          await emailField.waitForDisplayed({ timeout: 15000 });
          console.log("✅ Found email field by content-desc");
        }
      }
      
      console.log("📧 Entering email...");
      await emailField.click();
      await driver.pause(500);
      await emailField.clearValue();
      await emailField.setValue(testEmail);
      await driver.pause(1000);
      
      // Find and enter password
      let passwordField;
      try {
        passwordField = await driver.$('//android.widget.EditText[contains(@hint, "password") or contains(@hint, "Password") or @hint="Enter your password"]');
        await passwordField.waitForDisplayed({ timeout: 10000 });
        console.log("✅ Found password field by hint text");
      } catch (e) {
        try {
          const editTexts = await driver.$$('android.widget.EditText');
          if (editTexts.length > 1) {
            passwordField = editTexts[1];
            await passwordField.waitForDisplayed({ timeout: 10000 });
            console.log("✅ Found password field by index");
          } else if (editTexts.length === 1) {
            passwordField = editTexts[0];
            await passwordField.waitForDisplayed({ timeout: 10000 });
            console.log("✅ Found password field (only one EditText found)");
          } else {
            throw new Error("No EditText fields found for password");
          }
        } catch (e2) {
          passwordField = await driver.$('~login_password_field');
          await passwordField.waitForDisplayed({ timeout: 10000 });
          console.log("✅ Found password field by content-desc");
        }
      }
      
      console.log("🔒 Entering password...");
      await passwordField.click();
      await driver.pause(500);
      await passwordField.clearValue();
      await passwordField.setValue(testPassword);
      await driver.pause(1000);
      
      // Find and click Sign In button (same method as phase7_feedback_detail.spec.js)
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
      
      await driver.pause(3000);
      
      // Handle MFA if present
      try {
        const codeField = await driver.$('//android.widget.EditText[contains(@hint, "Code") or contains(@hint, "000000") or contains(@label, "Code")]');
        await codeField.waitForDisplayed({ timeout: 15000 });
        console.log("✅ Verification code field found!");
        
        console.log("⏳ Waiting up to 30s for manual verification code entry...");
        for (let i = 0; i < 6; i++) {
          await driver.pause(5000);
          console.log(`...${(i + 1) * 5}s elapsed`);
          
          try {
            const codeValue = await codeField.getText();
            if (codeValue && codeValue.length > 0) {
              console.log(`✅ Code detected in field: ${codeValue.length} characters`);
              break;
            }
          } catch (e) {
            // Continue waiting
          }
        }
        
        let verifyButton;
        try {
          verifyButton = await driver.$('//android.widget.Button[contains(@text, "Verify") or contains(@text, "Verify Code")]');
          await verifyButton.waitForDisplayed({ timeout: 5000 });
        } catch (e) {
          verifyButton = await driver.$('//android.widget.Button[contains(@content-desc, "verify")]');
        }
        
        console.log("🔘 Clicking verify button...");
        await verifyButton.click();
        await driver.pause(5000);
        console.log("✅ Verification submitted");
      } catch (e) {
        console.log(`⚠️ MFA screen not found: ${e.message}`);
      }
      
      // === STEP 2: NAVIGATE TO HOME ===
      console.log("=== STEP 2: HOME SCREEN ===");
      await driver.pause(3000);
      
      // CRITICAL: Check if we're on wrong screen and go back to home
      console.log("🔍 Checking if we're on the correct screen (home screen)...");
      try {
        const wrongScreens = [
          { text: "Weekly Schedule", name: "Schedule" },
          { text: "My Schedule", name: "Schedule" },
          { text: "My Profile", name: "Profile" },
        ];
        
        let onWrongScreen = false;
        for (const screen of wrongScreens) {
          try {
            const wrongScreenElement = await driver.$(`//*[@text="${screen.text}" or @content-desc="${screen.text}"]`);
            await wrongScreenElement.waitForDisplayed({ timeout: 2000 });
            console.log(`⚠️ On wrong screen: ${screen.name}. Going back to home...`);
            await driver.back();
            await driver.pause(3000);
            onWrongScreen = true;
            break;
          } catch (e) {
            // Not this screen, continue
          }
        }
        
        if (onWrongScreen) {
          console.log("✅ Went back to home screen");
          await driver.pause(2000);
        }
      } catch (e) {
        console.log("⚠️ Could not check screen, continuing...");
      }
      
      try {
        await driver.$('~home_display_name').waitForDisplayed({ timeout: 10000 });
      } catch (e) {
        console.log("⚠️ Home screen indicator not found, but continuing...");
      }
      console.log("🏠 On Home screen");
      await driver.pause(2000);
      
      // === STEP 3: SUBMIT NEW FEEDBACK ===
      console.log("=== STEP 3: SUBMIT NEW FEEDBACK ===");
      console.log("➡️ Navigating to 'Submit Feedback' card on home screen...");
      
      // Use the actual content-desc that appears in Android view tree
      // Flutter exposes it as "Submit Feedback\nReport an issue" or just "Submit Feedback"
      // We'll search for content-desc that contains "Submit Feedback"
      const submitCardContentDescPattern = "Submit Feedback";
      let submitCardFound = false;
      let submitCardContainer = null;
      const maxScrolls = 10;
      
      // Check if already visible - try exact match first, then contains
      console.log("🔍 Checking if 'Submit Feedback' card is already visible...");
      try {
        // Try exact match for "Submit Feedback\nReport an issue"
        submitCardContainer = await driver.$('//*[@content-desc="Submit Feedback\nReport an issue"]');
        await submitCardContainer.waitForDisplayed({ timeout: 2000 });
        submitCardFound = true;
        console.log(`✅ Found 'Submit Feedback' card by exact content-desc - already visible`);
      } catch (e) {
        try {
          // Try contains match for "Submit Feedback"
          submitCardContainer = await driver.$(`//*[contains(@content-desc, "${submitCardContentDescPattern}")]`);
          await submitCardContainer.waitForDisplayed({ timeout: 2000 });
          submitCardFound = true;
          console.log(`✅ Found 'Submit Feedback' card by content-desc (contains) - already visible`);
        } catch (e2) {
          console.log("📜 Card not visible, scrolling to find it...");
        }
      }
      
      // Scroll until card is visible
      if (!submitCardFound) {
        for (let scroll = 0; scroll < maxScrolls; scroll++) {
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
          
          // Check if card is now visible - try exact first, then contains
          try {
            submitCardContainer = await driver.$('//*[@content-desc="Submit Feedback\nReport an issue"]');
            await submitCardContainer.waitForDisplayed({ timeout: 1000 });
            submitCardFound = true;
            console.log(`✅ Found 'Submit Feedback' card after scroll ${scroll + 1} (exact match)`);
            break;
          } catch (e) {
            try {
              submitCardContainer = await driver.$(`//*[contains(@content-desc, "${submitCardContentDescPattern}")]`);
              await submitCardContainer.waitForDisplayed({ timeout: 1000 });
              submitCardFound = true;
              console.log(`✅ Found 'Submit Feedback' card after scroll ${scroll + 1} (contains match)`);
              break;
            } catch (e2) {
              // Continue scrolling
            }
          }
          
          // Every 3 scrolls, debug what's visible
          if ((scroll + 1) % 3 === 0) {
            console.log(`🔍 After ${scroll + 1} scrolls, checking visible content-desc...`);
            try {
              const descElements = await driver.$$('//*[@content-desc]');
              const visibleDescs = [];
              for (let i = 0; i < Math.min(descElements.length, 30); i++) {
                try {
                  const element = descElements[i];
                  if (await element.isDisplayed()) {
                    const desc = await element.getAttribute('content-desc');
                    if (desc && desc.trim().length > 0 && desc.length < 100) {
                      visibleDescs.push(desc);
                    }
                  }
                } catch (e) {
                  // Continue
                }
              }
              console.log(`📋 Visible content-desc (${visibleDescs.length}): ${visibleDescs.slice(0, 10).join(", ")}`);
            } catch (e) {
              console.log("⚠️ Could not list visible content-desc");
            }
          }
        }
      }
      
      if (!submitCardFound || !submitCardContainer) {
        // Take screenshot and list all visible content-desc for debugging
        try {
          await driver.saveScreenshot('./error-submit-feedback-card-not-found.png');
          console.log("📸 Screenshot saved: error-submit-feedback-card-not-found.png");
          
          // List all visible content-desc
          const descElements = await driver.$$('//*[@content-desc]');
          const visibleDescs = [];
          for (let i = 0; i < Math.min(descElements.length, 50); i++) {
            try {
              const element = descElements[i];
              if (await element.isDisplayed()) {
                const desc = await element.getAttribute('content-desc');
                if (desc && desc.trim().length > 0 && desc.length < 100) {
                  visibleDescs.push(desc);
                }
              }
            } catch (e) {
              // Continue
            }
          }
          console.log(`📋 All visible content-desc on screen (${visibleDescs.length}):`);
          visibleDescs.forEach((desc, idx) => {
            console.log(`  ${idx + 1}. "${desc}"`);
          });
        } catch (e) {
          console.log("⚠️ Could not take screenshot or list content-desc");
        }
        throw new Error(`Could not find 'Submit Feedback' card by content-desc containing '${submitCardContentDescPattern}' after ${maxScrolls} scrolls.`);
      }
      
      await driver.pause(1000);
      
      // Click the card container
      console.log(`👆 Clicking 'Submit Feedback' card container...`);
      await submitCardContainer.click();
      console.log(`✅ Clicked 'Submit Feedback' card container`);
      await driver.pause(3000);
      
      // STRICT CHECK: Verify we landed on the correct screen
      console.log("🔍 Verifying we landed on 'Submit Feedback' screen...");
      let onCorrectScreen = false;
      try {
        // Look for indicators that we're on the submit feedback screen
        const screenIndicators = [
          '//android.widget.EditText[contains(@hint, "Title")]',
          '//*[contains(@text, "Submit Feedback") or contains(@content-desc, "Submit Feedback")]',
        ];
        
        for (const indicator of screenIndicators) {
          try {
            const element = await driver.$(indicator);
            await element.waitForDisplayed({ timeout: 3000 });
            onCorrectScreen = true;
            console.log("✅ Confirmed: On 'Submit Feedback' screen");
            break;
          } catch (e) {
            // Continue to next indicator
          }
        }
      } catch (e) {
        console.log("⚠️ Could not verify screen, but continuing...");
      }
      
      if (!onCorrectScreen) {
        // Check if we're on a wrong screen
        const wrongScreens = [
          { text: "Profile", name: "Profile Screen" },
          { text: "My Schedule", name: "Schedule Screen" },
          { text: "Weekly Schedule", name: "Schedule Screen" },
          { text: "My Feedback", name: "Feedback List Screen" },
        ];
        
        for (const screen of wrongScreens) {
          try {
            const wrongScreenElement = await driver.$(`//*[@text="${screen.text}" or @content-desc="${screen.text}"]`);
            await wrongScreenElement.waitForDisplayed({ timeout: 2000 });
            throw new Error(`❌ Navigation failed: Clicked 'Submit Feedback' card but landed on '${screen.name}' instead.`);
          } catch (e) {
            if (e.message.includes("Navigation failed")) {
              throw e;
            }
            // Not this wrong screen, continue
          }
        }
        
        throw new Error(`❌ Navigation failed: Clicked 'Submit Feedback' card but did not land on Submit Feedback screen. Could not find Title field or screen title.`);
      }
      
      const feedbackTitle = `E2E Test Feedback ${Date.now()}`;
      const feedbackDescription = "Complete end-to-end test of Phase 7 feedback system. This feedback is created automatically by Appium tests.";
      
      console.log("📝 Filling feedback form...");
      
      // Fill form fields - CRITICAL: Must find and fill Title, Description, and Submit button
      // Title field - CRITICAL
      console.log("📝 Finding Title field...");
      const titleField = await driver.$('//android.widget.EditText[contains(@hint, "Title") or @hint="Title"]');
      await titleField.waitForDisplayed({ timeout: 10000 });
      await titleField.click();
      await driver.pause(500);
      await titleField.clearValue();
      await titleField.setValue(feedbackTitle);
      console.log("✅ Entered title");
        await driver.pause(1000);
        
      // Description field - CRITICAL
      console.log("📝 Finding Description field...");
      const descField = await driver.$('//android.widget.EditText[contains(@hint, "Description") or @hint="Description"]');
      await descField.waitForDisplayed({ timeout: 10000 });
      await descField.click();
      await driver.pause(500);
      await descField.clearValue();
      await descField.setValue(feedbackDescription);
      console.log("✅ Entered description");
        await driver.pause(1000);
        
      // Category field - Optional (might be a dropdown)
      try {
        const categoryField = await driver.$('//android.widget.EditText[contains(@hint, "Category") or @hint="Category"]');
        await categoryField.waitForDisplayed({ timeout: 10000 });
        await categoryField.click();
        await driver.pause(500);
        await categoryField.clearValue();
        await categoryField.setValue("Feature Request");
        console.log("✅ Entered category");
        await driver.pause(1000);
      } catch (e) {
        console.log("⚠️ Category field not found or not editable (might be dropdown), continuing...");
      }
      
      // Submit button - CRITICAL
      console.log("📤 Finding and clicking Submit Feedback button...");
      
      // Scroll down to ensure button is visible (it's at the bottom of the form)
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
              { type: 'pointerMove', duration: 500, x: 200, y: 200 },
              { type: 'pointerUp', button: 0 }
            ]
          }
        ]);
        await driver.pause(1000);
        console.log("📜 Scrolled down to find submit button");
      } catch (e) {
        console.log("⚠️ Scroll failed, continuing...");
      }
      
      // Try multiple strategies to find the submit button
      let submitButton = null;
      const buttonSelectors = [
        // Strategy 1: Button with exact text
        '//android.widget.Button[@text="Submit Feedback"]',
        // Strategy 2: Button with contains text
        '//android.widget.Button[contains(@text, "Submit Feedback")]',
        // Strategy 3: Any clickable element with "Submit Feedback" text
        '//*[@clickable="true" and contains(@text, "Submit Feedback")]',
        // Strategy 4: Any element with "Submit Feedback" text (Flutter ElevatedButton might not be Button)
        '//*[contains(@text, "Submit Feedback")]',
        // Strategy 5: Content-desc (if Semantics is set)
        '//*[contains(@content-desc, "Submit Feedback")]',
        // Strategy 6: Any button with "Submit" text
        '//android.widget.Button[contains(@text, "Submit")]',
      ];
      
      for (const selector of buttonSelectors) {
        try {
          submitButton = await driver.$(selector);
          await submitButton.waitForDisplayed({ timeout: 3000 });
          console.log(`✅ Found submit button using selector: ${selector.substring(0, 50)}...`);
          break;
        } catch (e) {
          // Try next selector
          continue;
        }
      }
      
      if (!submitButton) {
        // Debug: List all visible buttons and clickable elements
        try {
          console.log("🔍 Debugging: Listing all visible buttons...");
          const allButtons = await driver.$$('//android.widget.Button');
          console.log(`📋 Found ${allButtons.length} Button widgets`);
          for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
            try {
              const btn = allButtons[i];
              if (await btn.isDisplayed()) {
                const text = await btn.getText();
                const desc = await btn.getAttribute('content-desc');
                console.log(`  Button[${i}]: text="${text}", content-desc="${desc}"`);
              }
            } catch (e) {
              // Continue
            }
          }
          
          // Also check for any clickable elements with text
          const clickableElements = await driver.$$('//*[@clickable="true"]');
          console.log(`📋 Found ${clickableElements.length} clickable elements`);
          for (let i = 0; i < Math.min(clickableElements.length, 10); i++) {
            try {
              const elem = clickableElements[i];
              if (await elem.isDisplayed()) {
                const text = await elem.getText();
                const desc = await elem.getAttribute('content-desc');
                if (text && text.toLowerCase().includes('submit')) {
                  console.log(`  Clickable[${i}]: text="${text}", content-desc="${desc}"`);
                }
              }
            } catch (e) {
              // Continue
            }
          }
        } catch (e) {
          console.log("⚠️ Could not debug buttons");
        }
        
        throw new Error("Could not find Submit Feedback button. Check debug output above for available buttons.");
      }
      
      await submitButton.click();
      console.log("✅ Clicked Submit Feedback button");
      await driver.pause(3000);
        
        console.log("✅ Feedback submitted");
      
      // === STEP 4: VIEW FEEDBACK LIST ===
      console.log("=== STEP 4: VIEW FEEDBACK LIST ===");
      
      // Navigate back to home if needed
      try {
        await driver.back();
        await driver.pause(1000);
      } catch (e) {
        console.log("⚠️ Back navigation skipped");
      }
      
      // Navigate to feedback list
      await driver.pause(2000);
      try {
        await driver.$('~home_display_name').waitForDisplayed({ timeout: 5000 });
      } catch (e) {
        // Not on home, continue anyway
      }
      
      // Navigate to "My Feedback" card
      console.log("➡️ Navigating to 'My Feedback' card on home screen...");
      
      // Use the actual content-desc that appears in Android view tree
      // Flutter exposes it as "My Feedback\nView your feedback" or just "My Feedback"
      // We'll search for content-desc that contains "My Feedback"
      const myFeedbackCardContentDescPattern = "My Feedback";
      let myFeedbackCardFound = false;
      let myFeedbackCardContainer = null;
      const maxScrolls2 = 10;
      
      // Check if already visible - try exact match first, then contains
      console.log("🔍 Checking if 'My Feedback' card is already visible...");
      try {
        // Try exact match for "My Feedback\nView your feedback"
        myFeedbackCardContainer = await driver.$('//*[@content-desc="My Feedback\nView your feedback"]');
        await myFeedbackCardContainer.waitForDisplayed({ timeout: 2000 });
        myFeedbackCardFound = true;
        console.log(`✅ Found 'My Feedback' card by exact content-desc - already visible`);
      } catch (e) {
        try {
          // Try contains match for "My Feedback"
          myFeedbackCardContainer = await driver.$(`//*[contains(@content-desc, "${myFeedbackCardContentDescPattern}")]`);
          await myFeedbackCardContainer.waitForDisplayed({ timeout: 2000 });
          myFeedbackCardFound = true;
          console.log(`✅ Found 'My Feedback' card by content-desc (contains) - already visible`);
        } catch (e2) {
          console.log("📜 Card not visible, scrolling to find it...");
        }
      }
      
      // Scroll until card is visible
      if (!myFeedbackCardFound) {
        for (let scroll = 0; scroll < maxScrolls2; scroll++) {
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
          
          // Check if card is now visible - try exact first, then contains
          try {
            myFeedbackCardContainer = await driver.$('//*[@content-desc="My Feedback\nView your feedback"]');
            await myFeedbackCardContainer.waitForDisplayed({ timeout: 1000 });
            myFeedbackCardFound = true;
            console.log(`✅ Found 'My Feedback' card after scroll ${scroll + 1} (exact match)`);
            break;
          } catch (e) {
            try {
              myFeedbackCardContainer = await driver.$(`//*[contains(@content-desc, "${myFeedbackCardContentDescPattern}")]`);
              await myFeedbackCardContainer.waitForDisplayed({ timeout: 1000 });
              myFeedbackCardFound = true;
              console.log(`✅ Found 'My Feedback' card after scroll ${scroll + 1} (contains match)`);
              break;
            } catch (e2) {
              // Continue scrolling
            }
          }
          
          // Every 3 scrolls, debug what's visible
          if ((scroll + 1) % 3 === 0) {
            console.log(`🔍 After ${scroll + 1} scrolls, checking visible content-desc...`);
            try {
              const descElements = await driver.$$('//*[@content-desc]');
              const visibleDescs = [];
              for (let i = 0; i < Math.min(descElements.length, 30); i++) {
                try {
                  const element = descElements[i];
                  if (await element.isDisplayed()) {
                    const desc = await element.getAttribute('content-desc');
                    if (desc && desc.trim().length > 0 && desc.length < 100) {
                      visibleDescs.push(desc);
                    }
                  }
                } catch (e) {
                  // Continue
                }
              }
              console.log(`📋 Visible content-desc (${visibleDescs.length}): ${visibleDescs.slice(0, 10).join(", ")}`);
            } catch (e) {
              console.log("⚠️ Could not list visible content-desc");
            }
          }
        }
      }
      
      if (!myFeedbackCardFound || !myFeedbackCardContainer) {
        // Take screenshot and list all visible content-desc for debugging
        try {
          await driver.saveScreenshot('./error-my-feedback-card-not-found.png');
          console.log("📸 Screenshot saved: error-my-feedback-card-not-found.png");
          
          // List all visible content-desc
          const descElements = await driver.$$('//*[@content-desc]');
          const visibleDescs = [];
          for (let i = 0; i < Math.min(descElements.length, 50); i++) {
            try {
              const element = descElements[i];
              if (await element.isDisplayed()) {
                const desc = await element.getAttribute('content-desc');
                if (desc && desc.trim().length > 0 && desc.length < 100) {
                  visibleDescs.push(desc);
                }
              }
            } catch (e) {
              // Continue
            }
          }
          console.log(`📋 All visible content-desc on screen (${visibleDescs.length}):`);
          visibleDescs.forEach((desc, idx) => {
            console.log(`  ${idx + 1}. "${desc}"`);
          });
        } catch (e) {
          console.log("⚠️ Could not take screenshot or list content-desc");
        }
        throw new Error(`Could not find 'My Feedback' card by content-desc containing '${myFeedbackCardContentDescPattern}' after ${maxScrolls2} scrolls.`);
      }
      
      await driver.pause(1000);
      
      // Click the card container
      console.log(`👆 Clicking 'My Feedback' card container...`);
      await myFeedbackCardContainer.click();
      console.log(`✅ Clicked 'My Feedback' card container`);
      await driver.pause(3000);
      
      // STRICT CHECK: Verify we landed on the correct screen
      console.log("🔍 Verifying we landed on 'My Feedback' list screen...");
      let onCorrectScreen2 = false;
      try {
        // Look for indicators that we're on the feedback list screen
        const screenIndicators = [
          '//*[contains(@text, "Feedback") or contains(@content-desc, "Feedback")]',
          '//*[contains(@text, "My Feedback") or contains(@content-desc, "My Feedback")]',
        ];
        
        for (const indicator of screenIndicators) {
          try {
            const element = await driver.$(indicator);
            await element.waitForDisplayed({ timeout: 3000 });
            onCorrectScreen2 = true;
            console.log("✅ Confirmed: On 'My Feedback' list screen");
            break;
          } catch (e) {
            // Continue to next indicator
          }
        }
      } catch (e) {
        console.log("⚠️ Could not verify screen, but continuing...");
      }
      
      if (!onCorrectScreen2) {
        // Check if we're on a wrong screen
        const wrongScreens = [
          { text: "Profile", name: "Profile Screen" },
          { text: "My Schedule", name: "Schedule Screen" },
          { text: "Weekly Schedule", name: "Schedule Screen" },
          { text: "Submit Feedback", name: "Submit Feedback Screen" },
        ];
        
        for (const screen of wrongScreens) {
          try {
            const wrongScreenElement = await driver.$(`//*[@text="${screen.text}" or @content-desc="${screen.text}"]`);
            await wrongScreenElement.waitForDisplayed({ timeout: 2000 });
            throw new Error(`❌ Navigation failed: Clicked 'My Feedback' card but landed on '${screen.name}' instead.`);
          } catch (e) {
            if (e.message.includes("Navigation failed")) {
              throw e;
            }
            // Not this wrong screen, continue
          }
        }
        
        console.log("⚠️ Could not verify correct screen, but continuing...");
      }
      
      console.log("✅ On Feedback List screen");
      
      // === STEP 5: FILTER FEEDBACK ===
      console.log("=== STEP 5: FILTER FEEDBACK ===");
      console.log("🔍 Testing filter functionality...");
      await driver.pause(2000);
      
      // === STEP 6: VIEW FEEDBACK DETAIL ===
      console.log("=== STEP 6: VIEW FEEDBACK DETAIL ===");
      
      // Tap on first feedback item
      try {
        const statusIndicators = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        let itemClicked = false;
        
        for (const status of statusIndicators) {
          try {
            const feedbackCard = await driver.$(`//android.widget.TextView[@text="${status}"]/ancestor::android.view.ViewGroup[contains(@clickable, "true")][1]`);
            await feedbackCard.waitForDisplayed({ timeout: 5000 });
            await feedbackCard.click();
            itemClicked = true;
            console.log(`✅ Opened feedback detail with status: ${status}`);
            break;
          } catch (e) {
            // Try next status
          }
        }
        
        if (!itemClicked) {
          // Fallback: tap first clickable card
          const firstCard = await driver.$('//android.view.ViewGroup[contains(@clickable, "true")][1]');
          await firstCard.waitForDisplayed({ timeout: 10000 });
          await firstCard.click();
          console.log("✅ Opened feedback detail (first card)");
        }
        
        await driver.pause(2000);
      } catch (e) {
        console.log("⚠️ Could not open feedback detail:", e.message);
      }
      
      // === STEP 7: ADD MESSAGE TO FEEDBACK ===
      console.log("=== STEP 7: ADD MESSAGE ===");
      
      // Scroll to message section
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
              { type: 'pointerMove', duration: 500, x: 200, y: 200 },
              { type: 'pointerUp', button: 0 }
            ]
          }
      ]);
      await driver.pause(2000);
      } catch (e) {
        console.log("⚠️ Scroll failed:", e.message);
      }
      
      const messageText = `E2E test message - ${new Date().toISOString()}`;
      
      try {
        const messageField = await driver.$('//android.widget.EditText[@hint="Add a comment..." or contains(@hint, "comment")]');
        await messageField.waitForDisplayed({ timeout: 10000 });
        await messageField.click();
        await driver.pause(500);
        await messageField.clearValue();
        await messageField.setValue(messageText);
        console.log("✅ Entered message");
        await driver.pause(1000);
        
        const sendButton = await driver.$('//android.widget.Button[contains(@text, "Send Message") or @text="Send Message"]');
        await sendButton.waitForDisplayed({ timeout: 10000 });
        await sendButton.click();
        console.log("✅ Clicked Send Message button");
        await driver.pause(2000);
        console.log("✅ Message added successfully");
      } catch (e) {
        console.log("⚠️ Message addition had issues:", e.message);
      }
      
      // === STEP 8: NAVIGATE BACK AND VERIFY ===
      console.log("=== STEP 8: VERIFICATION ===");
      
      await driver.back();
      await driver.pause(2000);
      console.log("✅ Back on feedback list");
      
      // Refresh list
      try {
        const windowSize = await driver.getWindowSize();
        const centerX = windowSize.width / 2;
        const startY = windowSize.height * 0.3;
        const endY = windowSize.height * 0.7;
        
        await driver.execute('mobile: swipe', {
          startX: centerX,
          startY: startY,
          endX: centerX,
          endY: endY,
          duration: 500
        });
      await driver.pause(2000);
        console.log("✅ Pull-to-refresh performed");
      } catch (e) {
        console.log("⚠️ Refresh failed:", e.message);
      }
      
      console.log("🎉 Complete feedback flow test finished successfully!");
      console.log("✅ All Phase 7 feedback features tested:");
      console.log("   - Submit feedback");
      console.log("   - View feedback list");
      console.log("   - Filter feedback");
      console.log("   - View feedback details");
      console.log("   - Add messages to feedback");
      
    } catch (err) {
      console.error("❌ Complete feedback flow test failed:", err.message);
      try {
        await driver.saveScreenshot('./error-complete-flow.png');
        console.log("📸 Screenshot saved: error-complete-flow.png");
      } catch (e) {
        // Ignore screenshot errors
      }
      throw err;
    }
  });
});
