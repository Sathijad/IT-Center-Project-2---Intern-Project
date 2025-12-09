import { remote } from "webdriverio";
import { byValueKey } from "appium-flutter-finder";

// === Helper functions (same as other tests) ===
async function enterFlutterText(driver, key, text, label) {
  console.log(`⏳ Waiting for ${label}...`);
  await driver.executeScript("flutter:waitFor", [byValueKey(key)]);
  await driver.pause(400);

  console.log(`🖱️ Focusing ${label}...`);
  await driver.executeScript("flutter:clickElement", [byValueKey(key)]);
  await driver.pause(200);

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

async function tapFlutterElement(driver, key, label) {
  console.log(`👆 Tapping ${label}...`);
  await driver.executeScript("flutter:waitFor", [byValueKey(key)]);
  await driver.pause(200);
  await driver.executeScript("flutter:clickElement", [byValueKey(key)]);
  console.log(`✅ Clicked ${label}`);
}

// === Main test ===
describe("Flutter Forgot Password Flow", function () {
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
        "C:/Users/YaselaDisanayaka/Downloads/staff_auth_app/build/app/outputs/flutter-apk/app-debug.apk",
      "appium:automationName": "Flutter",
      "appium:flutterSystemPort": 4724,
      "appium:newCommandTimeout": 300,
      "appium:autoGrantPermissions": true,
      "appium:noReset": false,
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

  it("should reset password successfully via Forgot Password flow", async () => {
    try {
      // === LOGIN SCREEN ===
      console.log("⏳ Waiting for login screen...");
      await driver.executeScript("flutter:waitFor", [
        byValueKey("login_email_field"),
      ]);
      await tapFlutterElement(
        driver,
        "forgot_password_button_nav",
        "Forgot Password Button"
      );

      // === FORGOT PASSWORD SCREEN ===
      console.log("➡️ On Forgot Password screen.");
      const testEmail = "user@test.com";
      await enterFlutterText(
        driver,
        "forgot_password_email_field",
        testEmail,
        "Email Field"
      );
      await tapFlutterElement(
        driver,
        "send_reset_code_button",
        "Send Code Button"
      );
      console.log("✅ Forgot password email submitted.");

      // === WAIT FOR OTP MANUAL ENTRY ===
      console.log("⏳ Waiting up to 15s for OTP to be entered manually...");
      for (let i = 0; i < 3; i++) {
        await driver.pause(5000);
        console.log(`...${(i + 1) * 5}s elapsed`);
      }

      // === RESET PASSWORD SCREEN ===
      console.log("➡️ On Reset Password screen.");
      await driver.executeScript("flutter:waitFor", [
        byValueKey("reset_password_confirmation_code_field"),
      ]);
      //   await enterFlutterText(driver, "otp_field", "123456", "OTP Field"); // optional if you auto-inject OTP later

      const newPassword = "@NewPassword1234";
      await enterFlutterText(
        driver,
        "reset_password_new_password_field",
        newPassword,
        "New Password Field"
      );
      await enterFlutterText(
        driver,
        "reset_password_confirm_new_password_field",
        newPassword,
        "Confirm Password Field"
      );

      await tapFlutterElement(
        driver,
        "reset_password_button",
        "Reset Password Button"
      );
      console.log("✅ Password reset submitted.");

      // === SUCCESS POPUP ===
      console.log("⏳ Waiting for success popup...");
      await driver.executeScript("flutter:waitFor", [
        byValueKey("go_to_login_button"),
      ]);
      await tapFlutterElement(
        driver,
        "go_to_login_button",
        "Go to Login Button"
      );
      console.log("✅ Clicked 'Go to Login'.");

      // === LOGIN AGAIN WITH NEW PASSWORD ===
      console.log("🔁 Back on Login screen, logging in with new password...");
      await driver.executeScript("flutter:waitFor", [
        byValueKey("login_email_field"),
      ]);
      await enterFlutterText(
        driver,
        "login_email_field",
        testEmail,
        "Email Field"
      );
      await enterFlutterText(
        driver,
        "login_password_field",
        newPassword,
        "Password Field"
      );
      await tapFlutterElement(driver, "login_button", "Login Button");
      console.log("✅ Login submitted.");

      // === MFA SCREEN ===
      console.log("⏳ Waiting for MFA screen...");
      await driver.executeScript("flutter:waitFor", [
        byValueKey("mfa_otp_field"),
      ]);

      console.log("⏳ Waiting up to 15s for manual MFA entry...");
      for (let i = 0; i < 3; i++) {
        await driver.pause(5000);
        console.log(`...${(i + 1) * 5}s elapsed`);
      }

      await tapFlutterElement(driver, "verify_button", "Verify Button");
      console.log("✅ MFA submitted.");

      // === HOME SCREEN ===
      console.log("⏳ Waiting for Home screen...");
      await driver.executeScript("flutter:waitFor", [
        byValueKey("home_display_name"),
      ]);
      console.log(`🏠 Logged in successfully`);

      console.log(
        "🎉 Forgot password + reset + MFA flow completed successfully!"
      );
    } catch (err) {
      console.error("❌ Forgot password flow failed:", err.message);
      throw err;
    }
  });
});
