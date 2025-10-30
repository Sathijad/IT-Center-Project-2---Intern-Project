# Mobile Appium E2E Tests

This directory contains Appium end-to-end tests for the IT Center Flutter mobile app.

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

### Helper Functions

The `helpers/driver.ts` file provides:
- `createDriver()` - Creates WebDriver session with Appium
- `findElementByKey()` - Finds Flutter widgets by ValueKey
- `tapElement()` - Taps on elements
- `enterText()` - Enters text into text fields
- `getText()` - Gets text from elements
- `waitForElement()` - Waits for element with timeout
- `checkSnackbar()` - Checks for snackbar/toast messages

## Configuration

### Appium Capabilities

Default capabilities are defined in `tests/mobile/helpers/driver.ts`:

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
- `dashboard_welcome_card` - Home screen welcome card
- `profile_action_card` - Profile card on home screen
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

