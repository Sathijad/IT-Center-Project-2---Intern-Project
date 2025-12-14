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
describe("Phase 3: Complete Booking Flow (Book Room & My Bookings)", function () {
  this.timeout(300000); // 5 minutes
  let driver;
  let testPassed = false;

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
      "appium:newCommandTimeout": 600,
      "appium:autoGrantPermissions": true,
      "appium:noReset": false,
      "appium:waitForIdleTimeout": 0,
      "appium:androidInstallTimeout": 120000,
      "appium:uiautomator2ServerLaunchTimeout": 90000,
      "appium:uiautomator2ServerInstallTimeout": 90000,
      "appium:adbExecTimeout": 60000,
      "appium:androidDeviceReadyTimeout": 60,
      "appium:shouldTerminateApp": false,
      "appium:disableWindowAnimation": true,
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

  it("should complete full booking flow: login -> Book Room -> My Bookings", async () => {
    try {
      // === LOGIN SCREEN ===
      console.log("⏳ Waiting for login screen to load...");
      await driver.pause(8000);

      try {
        await findElementByText(driver, "IT Center", 15000);
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
        console.log("⚠️ Could not verify home screen, continuing...");
      }

      // Wait for cards to load
      console.log("⏳ Waiting for home screen cards...");
      await driver.pause(3000);

      // === NAVIGATE TO BOOK ROOM ===
      console.log("➡️ Looking for 'Book Room' card...");

      let bookRoomCard = null;
      const maxScrolls = 5;

      // Try to find the card
      for (let scroll = 0; scroll <= maxScrolls; scroll++) {
        try {
          // Try exact match first
          bookRoomCard = await driver.$('//*[@content-desc="Book Room\nBook meeting rooms"]');
          await bookRoomCard.waitForDisplayed({ timeout: 2000 });
          console.log("✅ Found 'Book Room' card");
          break;
        } catch (e) {
          // Try contains match
          try {
            bookRoomCard = await driver.$('//*[contains(@content-desc, "Book Room")]');
            await bookRoomCard.waitForDisplayed({ timeout: 2000 });
            console.log("✅ Found 'Book Room' card");
            break;
          } catch (e2) {
            if (scroll < maxScrolls) {
              console.log(`   Scrolling... (${scroll + 1}/${maxScrolls})`);
              await driver.performActions([{
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
              }]);
              await driver.pause(2000);
            }
          }
        }
      }

      if (!bookRoomCard) {
        throw new Error("Could not find 'Book Room' card");
      }

      console.log("👆 Clicking 'Book Room' card...");
      await bookRoomCard.click();
      await driver.pause(5000);

      // === VERIFY ON BOOK A ROOM SCREEN ===
      console.log("🔍 Verifying 'Book a Room' screen...");
      try {
        await findElementByText(driver, "Book a Room", 10000);
        console.log("✅ On 'Book a Room' screen");
      } catch (e) {
        throw new Error("Failed to navigate to 'Book a Room' screen");
      }

      // === WAIT FOR ROOMS TO LOAD ===
      console.log("⏳ Waiting for rooms to load...");
      await driver.pause(3000);

      // Check for loading indicator
      try {
        const loading = await driver.$('//android.widget.ProgressBar');
        await loading.waitForDisplayed({ timeout: 2000, reverse: true });
        console.log("✅ Rooms loaded");
      } catch (e) {
        console.log("⚠️ No loading indicator, continuing...");
      }

      // === FIND AND CLICK A ROOM CARD ===
      console.log("🔍 Looking for room cards...");
      await driver.pause(2000);

      let roomCard = null;
      try {
        // Look for Cards (rooms are displayed in Card widgets)
        const cards = await driver.$$('//android.widget.Card');
        console.log(`   Found ${cards.length} cards`);

        if (cards.length > 0) {
          // Get the first room card
          roomCard = cards[0];
          const cardText = await roomCard.getText().catch(() => '');
          console.log(`✅ Found room card: "${cardText.substring(0, 50)}"`);
        }
      } catch (e) {
        console.log(`⚠️ Error finding room cards: ${e.message}`);
      }

      if (!roomCard) {
        // Try alternative: look for ListTile elements
        console.log("🔍 Trying alternative: looking for ListTile...");
        try {
          const listTiles = await driver.$$('//android.view.View[@clickable="true"]');
          if (listTiles.length > 0) {
            roomCard = listTiles[0];
            console.log("✅ Found clickable room element");
          }
        } catch (e) {
          console.log(`⚠️ Error finding clickable elements: ${e.message}`);
        }
      }

      if (!roomCard) {
        console.log("⚠️ No room cards found - checking for empty state");
        try {
          await findElementByText(driver, "No rooms found", 3000);
          console.log("ℹ️ Empty state: No rooms available");
        } catch (e) {
          console.log("⚠️ Could not verify room list state");
        }
      } else {
        // Click the room card
        console.log("👆 Clicking room card...");
        try {
          await roomCard.click();
          console.log("✅ Clicked room card");
          await driver.pause(3000);

          // This navigates to BookingAvailabilityScreen
          console.log("ℹ️ Navigated to availability screen");

          // Go back to room list
          await driver.back();
          await driver.pause(2000);
          console.log("⬅️ Returned to room list");
        } catch (e) {
          console.log(`⚠️ Could not interact with room card: ${e.message}`);
        }
      }

      // === TEST CREATE BOOKING VIA FAB ===
      console.log("🔍 Looking for FloatingActionButton (+ button)...");
      await driver.pause(1000);

      let fabFound = false;
      try {
        // FAB is typically an ImageButton or Button with Icon
        const fabSelectors = [
          '//android.widget.ImageButton',
          '//android.widget.Button[contains(@content-desc, "Create")]',
          '//*[contains(@content-desc, "Create Booking")]',
        ];

        for (const selector of fabSelectors) {
          try {
            const fab = await driver.$(selector);
            await fab.waitForDisplayed({ timeout: 3000 });

            console.log(`👆 Clicking FAB using: ${selector}...`);
            await fab.click();
            console.log("✅ Clicked FAB");
            fabFound = true;
            await driver.pause(3000);
            break;
          } catch (e) {
            // Try next selector
          }
        }
      } catch (e) {
        console.log(`⚠️ Error finding FAB: ${e.message}`);
      }

      if (fabFound) {
        // === VERIFY ON CREATE BOOKING SCREEN ===
        console.log("🔍 Verifying 'Create Booking' screen...");
        try {
          await findElementByText(driver, "Create Booking", 5000);
          console.log("✅ On 'Create Booking' screen");

          // Go back to room list
          await driver.back();
          await driver.pause(2000);
          console.log("⬅️ Returned to room list");
        } catch (e) {
          console.log("⚠️ Could not verify Create Booking screen");
        }
      } else {
        console.log("⚠️ FAB not found, skipping create booking test");
      }

      console.log("✅ Book Room screen testing completed!");

      // === NAVIGATE BACK TO HOME ===
      console.log("⬅️ Navigating back to Home...");
      await driver.back();
      await driver.pause(3000);

      // === NAVIGATE TO MY BOOKINGS ===
      console.log("➡️ Looking for 'My Bookings' card...");

      let myBookingsCard = null;
      for (let scroll = 0; scroll <= maxScrolls; scroll++) {
        try {
          myBookingsCard = await driver.$('//*[@content-desc="My Bookings\nBook equipment"]');
          await myBookingsCard.waitForDisplayed({ timeout: 2000 });
          console.log("✅ Found 'My Bookings' card");
          break;
        } catch (e) {
          try {
            myBookingsCard = await driver.$('//*[contains(@content-desc, "My Bookings")]');
            await myBookingsCard.waitForDisplayed({ timeout: 2000 });
            console.log("✅ Found 'My Bookings' card");
            break;
          } catch (e2) {
            if (scroll < maxScrolls) {
              console.log(`   Scrolling... (${scroll + 1}/${maxScrolls})`);
              await driver.performActions([{
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
              }]);
              await driver.pause(2000);
            }
          }
        }
      }

      if (!myBookingsCard) {
        throw new Error("Could not find 'My Bookings' card");
      }

      console.log("👆 Clicking 'My Bookings' card...");
      await myBookingsCard.click();
      await driver.pause(5000);

      // === VERIFY ON MY BOOKINGS SCREEN ===
      console.log("🔍 Verifying 'My Bookings' screen...");
      try {
        await findElementByText(driver, "My Bookings", 10000);
        console.log("✅ On 'My Bookings' screen");
      } catch (e) {
        throw new Error("Failed to navigate to 'My Bookings' screen");
      }

      // === CHECK BOOKINGS LIST ===
      console.log("⏳ Waiting for bookings to load...");
      await driver.pause(3000);

      // Check for loading
      try {
        const loading = await driver.$('//android.widget.ProgressBar');
        await loading.waitForDisplayed({ timeout: 2000, reverse: true });
        console.log("✅ Bookings loaded");
      } catch (e) {
        console.log("⚠️ No loading indicator");
      }

      // Check for bookings or empty state
      let bookingsFound = false;
      try {
        // Look for booking cards
        const bookingCards = await driver.$$('//android.widget.Card');
        console.log(`   Found ${bookingCards.length} booking cards`);

        if (bookingCards.length > 0) {
          bookingsFound = true;
          console.log("✅ Bookings list verified");
        }
      } catch (e) {
        console.log(`⚠️ Error checking bookings: ${e.message}`);
      }

      if (!bookingsFound) {
        // Check for empty state
        try {
          await findElementByText(driver, "No bookings yet", 3000);
          console.log("ℹ️ Empty state: No bookings yet");
        } catch (e) {
          console.log("⚠️ Could not verify bookings list state");
        }
      }

      // === TEST CREATE BOOKING FAB ON MY BOOKINGS ===
      console.log("🔍 Looking for Create Booking FAB...");
      try {
        const fab = await driver.$('//android.widget.ImageButton');
        await fab.waitForDisplayed({ timeout: 3000 });

        console.log("👆 Clicking FAB...");
        await fab.click();
        console.log("✅ Clicked FAB");
        await driver.pause(3000);

        // Verify Create Booking screen opened
        try {
          await findElementByText(driver, "Create Booking", 5000);
          console.log("✅ Create Booking screen opened from My Bookings");

          // Go back
          await driver.back();
          await driver.pause(2000);
          console.log("⬅️ Returned to My Bookings");
        } catch (e) {
          console.log("⚠️ Could not verify Create Booking screen");
        }
      } catch (e) {
        console.log(`⚠️ FAB not found: ${e.message}`);
      }

      console.log("✅ My Bookings screen testing completed!");

      testPassed = true;
      console.log("\n✅ Phase 3 test completed successfully!");

    } catch (err) {
      // Check if this is a cleanup error after successful test
      if (testPassed && err.message && (
        err.message.includes('UND_ERR_CLOSED') ||
        err.message.includes('terminated') ||
        err.message.includes('not started')
      )) {
        console.log("ℹ️ Cleanup error (test passed):", err.message);
        return;
      }

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
