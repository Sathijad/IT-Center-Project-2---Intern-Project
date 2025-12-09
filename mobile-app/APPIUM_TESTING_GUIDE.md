# Appium Testing Guide

This guide explains how to run Appium tests with Flutter Driver support.

## Overview

The app now supports **conditional Flutter Driver extension**:
- **Normal app runs**: Flutter Driver is **disabled** (app works normally)
- **Appium tests**: Flutter Driver is **enabled** when building with the test flag

## Quick Start

### Option 1: Use the Automated Script (Recommended)

```powershell
# From mobile-app directory
.\build-and-test.ps1
```

This script will:
1. Get Flutter dependencies
2. Build APK with Flutter Driver enabled
3. Start Appium server (if not running)
4. Run the Appium tests

**Script Options:**
```powershell
# Skip building (use existing APK)
.\build-and-test.ps1 --SkipBuild

# Skip Appium startup (if already running)
.\build-and-test.ps1 --SkipAppium

# Both
.\build-and-test.ps1 --SkipBuild --SkipAppium
```

### Option 2: Manual Steps

#### Step 1: Get Dependencies
```powershell
cd mobile-app
flutter pub get
```

#### Step 2: Build APK with Flutter Driver Enabled
```powershell
flutter build apk --debug --dart-define=ENABLE_FLUTTER_DRIVER=true
```

**Important:** The `--dart-define=ENABLE_FLUTTER_DRIVER=true` flag is required to enable Flutter Driver extension in the APK.

#### Step 3: Start Appium Server (in a separate terminal)
```powershell
cd mobile-app\appium_flutter_test
$env:APPIUM_HOME = (Get-Location).Path
appium --base-path / --relaxed-security --port 4723
```

Or use the provided script:
```powershell
cd mobile-app\appium_flutter_test
.\start-appium.ps1
```

#### Step 4: Run Tests
```powershell
cd mobile-app\appium_flutter_test
npm run wdio
```

## Building APK for Normal Use (Without Flutter Driver)

For regular app development and testing (not Appium), build normally:

```powershell
flutter build apk --debug
# OR
flutter run
```

Flutter Driver will **not** be enabled, so the app will work normally.

## How It Works

The `main.dart` file checks for the `ENABLE_FLUTTER_DRIVER` environment variable:

```dart
const bool enableDriver = bool.fromEnvironment('ENABLE_FLUTTER_DRIVER', defaultValue: false);
if (enableDriver) {
  enableFlutterDriverExtension();
}
```

- When `ENABLE_FLUTTER_DRIVER=true` is set via `--dart-define`, Flutter Driver is enabled
- Otherwise, it defaults to `false` and Flutter Driver is disabled

## Troubleshooting

### Tests fail to find elements
- Verify the APK was built with `--dart-define=ENABLE_FLUTTER_DRIVER=true`
- Check that Appium Flutter driver is installed: `appium driver list` (should show `flutter`)
- Ensure Appium server is running on port 4723

### App crashes on startup
- Make sure you're using the correct APK:
  - **For normal use**: Build without the flag (`flutter build apk --debug`)
  - **For Appium tests**: Build with the flag (`flutter build apk --debug --dart-define=ENABLE_FLUTTER_DRIVER=true`)

### APK path in wdio.conf.js
The APK path in `appium_flutter_test/wdio.conf.js` should point to:
```
C:/Users/SathijaDeshapriya/Downloads/IT Center Project 2/mobile-app/build/app/outputs/flutter-apk/app-debug.apk
```

Update this path if your project location is different.

## Current Configuration

- **Automation**: UiAutomator2 (works with or without Flutter Driver)
- **Flutter Driver**: Conditionally enabled for Appium tests
- **Platform**: Android 13
- **Device**: emulator-5554 (update in `wdio.conf.js` if different)

## Notes

- You **don't need to rebuild** the APK every time you run tests if nothing changed
- Use `--SkipBuild` flag to skip rebuilding when running tests multiple times
- Appium server can run in the background - you don't need to restart it for each test run

