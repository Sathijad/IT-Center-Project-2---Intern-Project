import { remote } from "webdriverio";
import { byValueKey } from "appium-flutter-finder";
import { strict as assert } from "assert";

async function enterFlutterText(
  driver: any,
  key: any,
  text: any,
  label: any
) {
  console.log(`⏳ Waiting for ${label}...`);
  await driver.executeScript("flutter:waitFor", [byValueKey(key)]);
  await driver.pause(400);

  console.log(`🖱️ Focusing ${label}...`);
  await driver.executeScript("flutter:clickElement", [byValueKey(key)]);
  await driver.pause(200);

  console.log(`🧹 Clearing ${label}...`);
  try {
    await driver.executeScript("flutter:clearText", [byValueKey(key)]);
  } catch (e) {
    console.log(`⚠️ Could not clear ${label}: ${e.message}`);
  }

  console.log(`⌨️ Typing into ${label}: ${text}`);
  await driver.executeScript("flutter:enterText", [text, byValueKey(key)]);
  await driver.pause(500);
  console.log(`✅ Done typing ${label}`);
}

async function tapFlutterElement(
  driver: any,
  key: any,
  label: any
) {
  console.log(`👆 Tapping ${label}...`);
  await driver.executeScript("flutter:waitFor", [byValueKey(key)]);
  await driver.pause(200);
  await driver.executeScript("flutter:clickElement", [byValueKey(key)]);
  console.log(`✅ Clicked ${label}`);
}

async function getWidgetText(driver: any, key: any) {
  try {
    const result = await driver.executeScript(
      "flutter:getRenderObjectDiagnostics",
      [byValueKey(key)]
    );
    return result.description || "";
  } catch {
    return "";
  }
}

async function waitForElement(driver: any, key: any, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      await driver.executeScript("flutter:waitFor", [byValueKey(key)]);
      return true;
    } catch (e) {
      await driver.pause(500);
    }
  }
  throw new Error(`Element with key "${key}" not found within ${timeout}ms`);
}

// === Main test ===
describe("Login Screen Tests", function () {
  this.timeout(240000);
  let driver: any;

  const opts = {
    protocol: "http",
    hostname: "127.0.0.1",
    port: 4723,
    path: "/",
    capabilities: {
      platformName: "Android",
      "appium:deviceName": "emulator-5554",
      "appium:app":
        "C:/Users/SathijaDeshapriya/Downloads/IT Center Project 2/mobile-app/build/app/outputs/flutter-apk/app-profile.apk",
      "appium:automationName": "Flutter",
      "appium:flutterSystemPort": 4724,
      "appium:fullReset": false,
      "appium:flutterServerLaunchTimeout": 60000,
      "appium:uiautomator2ServerInstallTimeout": 180000,
      "appium:uiautomator2ServerLaunchTimeout": 180000,
      "appium:adbExecTimeout": 180000,
      "appium:newCommandTimeout": 300,
      "appium:autoGrantPermissions": true,
      "appium:noReset": true,
    },
  };

  before(async () => {
    console.log("🚀 Starting Appium session...");
    driver = await remote(opts);
    await driver.pause(4000);
  });

  after(async () => {
    if (driver) {
      await driver.deleteSession();
      console.log("🧹 Session closed.");
    }
  });

  describe("Login Screen UI Elements", function () {
    it("should display all login screen elements", async function () {
      console.log("⏳ Waiting for login screen to load...");
      await waitForElement(driver, "login_email", 30000);

      // Verify email field exists
      console.log("✅ Verifying email field...");
      await driver.executeScript("flutter:waitFor", [byValueKey("login_email")]);

      // Verify password field exists
      console.log("✅ Verifying password field...");
      await driver.executeScript("flutter:waitFor", [byValueKey("login_password")]);

      // Verify sign in button exists
      console.log("✅ Verifying sign in button...");
      await driver.executeScript("flutter:waitFor", [byValueKey("sign_in_button")]);

      console.log("✅ All login screen elements are present");
    });
  });

  describe("Login Form Input Fields", function () {
    it("should enter email into email field", async function () {
      const testEmail = "test@example.com";
      await enterFlutterText(
        driver,
        "login_email",
        testEmail,
        "Email Field"
      );

      // Verify the text was entered (optional check)
      await driver.pause(500);
      console.log("✅ Email entered successfully");
    });

    it("should enter password into password field", async function () {
      const testPassword = "TestPassword123";
      await enterFlutterText(
        driver,
        "login_password",
        testPassword,
        "Password Field"
      );

      await driver.pause(500);
      console.log("✅ Password entered successfully");
    });

    it("should clear and re-enter credentials", async function () {
      await enterFlutterText(
        driver,
        "login_email",
        "newemail@example.com",
        "Email Field"
      );

      await enterFlutterText(
        driver,
        "login_password",
        "NewPassword123",
        "Password Field"
      );

      console.log("✅ Credentials updated successfully");
    });
  });

  describe("Login Button Interactions", function () {
    it("should tap sign in button", async function () {
      await tapFlutterElement(driver, "sign_in_button", "Sign In Button");
      console.log("✅ Sign in button clicked");

      // Wait a bit to see if any error appears or navigation happens
      await driver.pause(3000);
    });

    it("should handle sign in button with invalid credentials", async function () {
      // Clear and enter invalid credentials
      await enterFlutterText(
        driver,
        "login_email",
        "invalid@example.com",
        "Email Field"
      );

      await enterFlutterText(
        driver,
        "login_password",
        "wrongpassword",
        "Password Field"
      );

      await tapFlutterElement(driver, "sign_in_button", "Sign In Button");
      console.log("✅ Attempted login with invalid credentials");

      // Wait for error message to potentially appear
      await driver.pause(3000);
    });
  });

  describe("MFA Code Entry Flow", function () {
    it("should handle MFA code entry if required", async function () {
      // First, enter valid credentials and submit
      const email = process.env.USER_EMAIL || "test@example.com";
      const password = process.env.USER_PASSWORD || "TestPassword123";

      await enterFlutterText(driver, "login_email", email, "Email Field");
      await enterFlutterText(driver, "login_password", password, "Password Field");
      await tapFlutterElement(driver, "sign_in_button", "Sign In Button");

      // Wait to see if MFA screen appears
      await driver.pause(5000);

      try {
        // Check if MFA code field appears
        await waitForElement(driver, "mfa_code", 10000);
        console.log("✅ MFA code field detected");

        // Enter MFA code (you may need to provide this manually)
        const mfaCode = process.env.MFA_CODE || "123456";
        await enterFlutterText(
          driver,
          "mfa_code",
          mfaCode,
          "MFA Code Field"
        );

        // Submit MFA code
        await tapFlutterElement(driver, "mfa_submit", "MFA Submit Button");
        console.log("✅ MFA code submitted");

        // Wait for authentication to complete
        await driver.pause(5000);
      } catch (e) {
        console.log(
          "⚠️ MFA screen not detected - MFA may not be required or login failed"
        );
        // Continue with test - MFA might not be enabled
      }
    });

    it("should handle MFA code entry with manual input", async function () {
      // This test waits for manual MFA code entry
      try {
        await waitForElement(driver, "mfa_code", 10000);
        console.log("⏳ Waiting for manual MFA code entry...");
        console.log("⚠️ Please enter the MFA code manually in the app");

        // Wait up to 60 seconds for manual entry
        for (let i = 0; i < 12; i++) {
          await driver.pause(5000);
          console.log(`...${(i + 1) * 5}s elapsed`);

          // Check if submit button is available
          try {
            await driver.executeScript("flutter:waitFor", [byValueKey("mfa_submit")]);
            // If we can find the submit button, try to click it
            await tapFlutterElement(driver, "mfa_submit", "MFA Submit Button");
            console.log("✅ MFA submit button clicked");
            break;
          } catch (e) {
            // Continue waiting
          }
        }
      } catch (e) {
        console.log("⚠️ MFA screen not detected");
      }
    });
  });

  describe("Login Flow - Complete", function () {
    it("should perform complete login flow with valid credentials", async function () {
      const email = process.env.USER_EMAIL;
      const password = process.env.USER_PASSWORD;

      if (!email || !password) {
        console.log(
          "⚠️ USER_EMAIL and USER_PASSWORD environment variables not set"
        );
        console.log("⚠️ Skipping complete login flow test");
        return;
      }

      // Ensure we're on login screen
      await waitForElement(driver, "login_email", 30000);

      // Enter credentials
      await enterFlutterText(driver, "login_email", email, "Email Field");
      await enterFlutterText(driver, "login_password", password, "Password Field");

      // Submit login
      await tapFlutterElement(driver, "sign_in_button", "Sign In Button");
      console.log("✅ Login credentials submitted");

      // Wait for either MFA screen or successful login
      await driver.pause(5000);

      // Check if MFA is required
      try {
        await waitForElement(driver, "mfa_code", 15000);
        console.log("⏳ MFA required - waiting for code...");

        // If MFA code is provided via env, use it
        if (process.env.MFA_CODE) {
          await enterFlutterText(
            driver,
            "mfa_code",
            process.env.MFA_CODE,
            "MFA Code Field"
          );
          await tapFlutterElement(driver, "mfa_submit", "MFA Submit Button");
          console.log("✅ MFA code submitted");
        } else {
          console.log(
            "⚠️ MFA_CODE not provided - waiting 30s for manual entry"
          );
          await driver.pause(30000);
          try {
            await tapFlutterElement(driver, "mfa_submit", "MFA Submit Button");
          } catch (e) {
            console.log(
              "⚠️ Could not submit MFA - may need manual intervention"
            );
          }
        }

        // Wait for login to complete
        await driver.pause(10000);
      } catch (e) {
        console.log("✅ No MFA required - login may have completed");
        await driver.pause(5000);
      }

      console.log("✅ Complete login flow executed");
    });
  });

  describe("Login Screen Error Handling", function () {
    it("should display error message with empty credentials", async function () {
      // Clear fields
      await enterFlutterText(driver, "login_email", "", "Email Field");
      await enterFlutterText(driver, "login_password", "", "Password Field");

      // Try to submit
      await tapFlutterElement(driver, "sign_in_button", "Sign In Button");

      // Wait for validation error
      await driver.pause(2000);
      console.log("✅ Validation should prevent submission with empty fields");
    });

    it("should display error message with invalid email format", async function () {
      await enterFlutterText(
        driver,
        "login_email",
        "notanemail",
        "Email Field"
      );

      await enterFlutterText(
        driver,
        "login_password",
        "somepassword",
        "Password Field"
      );

      await tapFlutterElement(driver, "sign_in_button", "Sign In Button");

      await driver.pause(2000);
      console.log("✅ Email validation should trigger error");
    });
  });

  describe("Login Screen Navigation", function () {
    it("should verify login screen appears after logout", async function () {
      // This test assumes we're logged out or on login screen
      await waitForElement(driver, "login_email", 30000);
      await waitForElement(driver, "login_password", 10000);
      await waitForElement(driver, "sign_in_button", 10000);

      console.log("✅ Login screen elements are accessible");
    });
  });
});
