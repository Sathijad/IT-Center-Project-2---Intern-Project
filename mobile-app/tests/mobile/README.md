# Mobile Appium E2E Tests

This directory contains Appium end-to-end tests for the IT Center Flutter mobile app.

> **Note:** The previous `appium-flutter-test/` WebdriverIO sample project has been removed. All mobile E2E automation now lives under `tests/mobile`.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Android SDK** and **Android Emulator** or physical device
3. **Appium** (installed via npm)
4. **Flutter** SDK (for building the APK)
5. **Java JDK** (for Android build tools)

## Setup

### 1. Install Dependencies

```bash
cd mobile-app
npm install
```

This installs:
- `appium` - Appium server
- `@appium/flutter-driver` - Flutter driver plugin for Appium
- `webdriverio` - WebDriver client
- `mocha` - Test runner
- `typescript` - TypeScript compiler
- `chai` - Assertion library

### 2. Install Appium Flutter Driver Plugin

After installing dependencies, install the Flutter driver plugin globally or ensure it's configured:

```bash
appium driver install flutter
```

### 3. Build Flutter APK

Build the debug APK for testing:

```bash
cd mobile-app
flutter build apk --debug
```

The APK will be located at: `build/app/outputs/flutter-apk/app-debug.apk`
  
> **Note:** `lib/main.dart` enables the Flutter driver extension at startup so the Appium Flutter driver can attach. No extra build target is required—`flutter build apk --debug` already produces an instrumented binary.

### 4. Start Android Emulator

Start an Android emulator or connect a physical device:

**Using Android Studio:**
1. Open Android Studio
2. Go to Tools > Device Manager
3. Create/start an Android Virtual Device (AVD)
4. Ensure the emulator is running

**Using Command Line:**
```bash
# List available emulators
emulator -list-avds

# Start an emulator (replace <avd_name> with your AVD name)
emulator -avd <avd_name>
```

**Verify device is connected:**
```bash
adb devices
```

You should see your emulator listed.

### 5. Start Appium Server

In a separate terminal, start the Appium server:

```bash
cd mobile-app
npm run appium:start
```

Or directly:
```bash
appium --base-path /wd/hub
```

The server will start on `http://localhost:4723`

## Running Tests

### Using WebDriverIO (Recommended)

WebDriverIO provides better integration with Appium and is the recommended approach:

```bash
# Run all tests
npm run wdio:test

# Run specific test
npm run wdio:test:login

# Run Phase 2 tests
npm run wdio:test:phase2
```

Or directly:
```bash
npx wdio run wdio.conf.js
```

#### Using dartObservatoryUri (Alternative Connection Method)

If you encounter connection issues with the default `flutterSystemPort` approach, you can use the `dartObservatoryUri` method:

1. **Build and run the Flutter app:**
   ```bash
   flutter clean
   flutter run -t lib/main.dart
   ```

2. **Find the VM device connection string** in the terminal output. Look for something like:
   ```
   VM device connected http://127.0.0.1:54970/40006l_g1vk
   ```

3. **Convert it to WebSocket URI format:**
   - Extract the part: `127.0.0.1:54970/40006l_g1vk`
   - Convert to: `ws://127.0.0.1:54970/40006l_g1vk=/ws`

4. **Set the environment variable and run tests:**
   ```bash
   # Windows PowerShell
   $env:DART_OBSERVATORY_URI="ws://127.0.0.1:54970/40006l_g1vk=/ws"
   npx wdio run wdio.conf.js
   
   # Windows CMD
   set DART_OBSERVATORY_URI=ws://127.0.0.1:54970/40006l_g1vk=/ws
   npx wdio run wdio.conf.js
   
   # Linux/Mac
   export DART_OBSERVATORY_URI="ws://127.0.0.1:54970/40006l_g1vk=/ws"
   npx wdio run wdio.conf.js
   ```

5. **Stop the Flutter run process** (keep the app running on the emulator)

**Note:** The `dartObservatoryUri` method requires the app to be running via `flutter run`. The default `flutterSystemPort` method works with a built APK and doesn't require `flutter run`.

### Using Mocha (Legacy)

### Run All Tests

```bash
npm run mobile:test
```

### Run Individual Test Suites

```bash
# Login tests
npm run mobile:test:login

# Profile tests
npm run mobile:test:profile

# Roles tests
npm run mobile:test:roles

# Phase 2 - Leave tests
npm run mobile:test:leave

# Phase 2 - Attendance tests
npm run mobile:test:attendance

# Phase 2 - Leave + Attendance bundle
npm run mobile:test:phase2

# Login with manual verification helper
npm run mobile:test:verification
```

### Test Timeout

Tests have a default timeout of 120 seconds (2 minutes). This can be adjusted in `package.json` or individual test files.

## Test Structure

### Tests Overview

1. **login.spec.ts** - Tests the login flow:
   - App launch
   - Sign in button interaction
   - Hosted UI login (Cognito)
   - Dashboard verification

2. **profile.spec.ts** - Tests profile functionality:
   - Opening profile screen
   - Updating display name
   - Saving profile changes
   - Verifying snackbar/toast notifications
   - Checking persisted values

3. **roles.read.spec.ts** - Tests role display:
   - Opening profile screen
   - Verifying roles card
   - Asserting ADMIN or EMPLOYEE role chips
   - Checking Account Information expansion tile

4. **login-with-verification.spec.ts** - Direct email/password login with MFA support:
   - Enters credentials with Flutter ValueKeys
   - Waits for verification code field or dashboard
   - Pauses up to 90s for manual code entry and continue

5. **leave-management.spec.ts** - Leave/attendance Phase 2 smoke tests:
   - Logs in with helper (manual MFA if needed)
   - Navigates to Apply Leave, Leave Balance, Clock In/Out
   - Ensures cards/screens open without crashes

6. **attendance-management.spec.ts** - Attendance-only Phase 2 checks:
   - Uses the same login helper
   - Opens Clock In/Out view
   - Confirms recent logs / state cards render

### Helper Functions

The `helpers/driver.ts` file provides:
- `createDriver()` - Creates WebDriver session with Appium
- `findElementByKey()` - Finds Flutter widgets by ValueKey
- `tapElement()` - Taps on elements
- `enterText()` - Enters text into text fields
- `getText()` - Gets text from elements
- `waitForElement()` - Waits for element with timeout
- `checkSnackbar()` - Checks for snackbar/toast messages

The `helpers/login-helper.ts` file (Phase 2) adds:
- `loginWithVerificationCode()` - Automates credential entry and pauses for manual MFA
- `isLoggedIn()` - Quick check to skip redundant logins

### Verification Code / MFA Flow

When Cognito enforces MFA the tests will log `VERIFICATION CODE REQUIRED`. At that point:

1. Keep the emulator in focus and manually enter the code delivered by Cognito.
2. Tap the `Verify Code` button (ValueKey: `verify_code_button`).
3. The helper polls for the button to disappear and then waits for the `dashboard_welcome_card`.
4. If 90 seconds elapse without continuation the test fails with a timeout (re-run after entering the code).

You can adjust the wait by passing a different timeout to `loginWithVerificationCode`.

## Configuration

### WebDriverIO Configuration

The main WebDriverIO configuration is in `wdio.conf.js` at the project root. It supports:

- **Environment variables** for customization:
  - `APPIUM_PORT` - Appium server port (default: 4723)
  - `APPIUM_DEVICE` - Device name (default: emulator-5554)
  - `APPIUM_APP` - Path to APK file
  - `APPIUM_PLATFORM_VERSION` - Android version (default: 13.0)
  - `FLUTTER_SYS_PORT` - Flutter system port (default: 4724)
  - `DART_OBSERVATORY_URI` - WebSocket URI for Flutter driver (alternative to flutterSystemPort)

- **Default capabilities:**
  ```javascript
  {
    platformName: 'Android',
    'appium:deviceName': 'emulator-5554',
    'appium:app': './build/app/outputs/flutter-apk/app-debug.apk',
    'appium:automationName': 'Flutter',
    'appium:flutterSystemPort': 4724,
    'appium:driver': 'flutter'
  }
  ```

### Mocha Test Configuration

Default capabilities for Mocha tests are defined in `tests/mobile/helpers/driver.ts`:

```typescript
{
  platformName: 'Android',
  deviceName: 'Android Emulator',
  app: './build/app/outputs/flutter-apk/app-debug.apk',
  automationName: 'Flutter'
}
```

To customize capabilities, modify the `createDriver()` function call or pass custom capabilities.

### Test Accounts

For login tests, you'll need valid test account credentials:
- Email: Use a test account configured in your Cognito user pool
- Password: The password for the test account

**Note:** The app uses Cognito Hosted UI for authentication. The login test handles the web-based login flow, which may require switching contexts between native and webview.

## ValueKeys in Flutter App

The Flutter app has been instrumented with ValueKeys for testing:

- `sign_in_button` - Login screen sign in button
- `email_field` - Email text field
- `password_field` - Password text field
- `verification_code_field` - MFA/verification code input
- `verify_code_button` - Button to submit verification code
- `dashboard_welcome_card` - Home screen welcome card
- `profile_action_card` - Profile card on home screen
- `apply_leave_action_card` - Navigate to Apply Leave screen
- `leave_balance_action_card` - Navigate to Leave Balance screen
- `clock_inout_action_card` - Navigate to Clock In/Out screen
- `display_name_field` - Display name text field in profile
- `profile_save_button` - Save button in profile screen
- `roles_card` - Roles display card in profile
- `role_chip_ADMIN` / `role_chip_EMPLOYEE` - Individual role chips
- `roles_expansion_tile` - Account Information expansion tile

## Troubleshooting

### Appium Server Won't Start

- Ensure port 4723 is not in use
- Check if Appium is installed: `appium --version`
- Install Flutter driver: `appium driver install flutter`

### Emulator Not Detected

- Verify emulator is running: `adb devices`
- Check ADB path is in system PATH
- Restart ADB: `adb kill-server && adb start-server`

### Tests Fail to Find Elements

- Verify APK is built: `flutter build apk --debug`
- Check APK path in capabilities matches actual location
- Ensure app is installed on emulator
- Verify ValueKeys are correct in Flutter code
- Check Flutter driver plugin is installed

### Login Tests Fail

- Login uses Cognito Hosted UI (web-based)
- May need to handle context switching (native ↔ webview)
- Ensure test account credentials are valid
- Check network connectivity for Cognito

### Text Input Issues

- Flutter driver text input can be tricky
- May need to tap field first to focus
- Some fields may require special handling

## Advanced Usage

### Custom Capabilities

You can pass custom capabilities when creating the driver:

```typescript
const driver = await createDriver({
  app: '/path/to/custom.apk',
  deviceName: 'My Device Name'
});
```

### Debugging

Enable verbose logging:
- Appium: `appium --log-level debug`
- WebDriverIO: Add `logLevel: 'debug'` to driver options

### Running on Physical Device

1. Enable USB debugging on device
2. Connect via USB
3. Verify with `adb devices`
4. Use device name in capabilities or let it auto-detect

### CI/CD Integration

For CI/CD pipelines:
1. Start emulator in headless mode or use cloud testing services
2. Build APK before running tests
3. Start Appium server as background process
4. Run tests with appropriate timeouts

Example CI script:
```bash
# Build APK
flutter build apk --debug

# Start Appium in background
npm run appium:start &

# Wait for Appium to start
sleep 10

# Run tests
npm run mobile:test

# Cleanup
killall appium
```

## Test Execution Notes

- Tests assume a clean app state (logged out) for login tests
- Profile and roles tests assume user is logged in
- Some tests may require manual intervention for Hosted UI login
- Timeout values can be adjusted based on device/network performance

## Resources

- [Appium Documentation](https://appium.io/docs/en/latest/)
- [Flutter Driver for Appium](https://github.com/appium/appium-flutter-driver)
- [WebDriverIO Documentation](https://webdriver.io/)
- [Mocha Documentation](https://mochajs.org/)

