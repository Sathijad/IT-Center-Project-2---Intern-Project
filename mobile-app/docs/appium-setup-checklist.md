# Appium Setup Checklist

This checklist must be completed before running Appium tests for the IT Center mobile app.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Flutter SDK installed and in PATH
- ✅ Android SDK installed (Android Studio recommended)
- ✅ Java JDK installed (for Android SDK tools)

---

## Step 0: Enable the Flutter Driver Extension

- `lib/main.dart` calls `enableFlutterDriverExtension()` before `runApp`.
- `flutter_driver` is listed in `pubspec.yaml` under `dev_dependencies`.
- Build **debug** APKs after making the change so the VM service is exposed.

---

## Step 1: Android SDK & Emulator Setup

### 1.1 Verify ADB is working

```powershell
adb devices
```

**Expected output:**
```
List of devices attached
emulator-5554    device
```

If no devices appear, start an emulator (see step 1.2).

### 1.2 Start Android Emulator

**Option A: From Android Studio**
1. Open Android Studio
2. Tools → Device Manager
3. Click ▶️ (Play) on your emulator

**Option B: From Command Line**
```powershell
# List available emulators
emulator -list-avds

# Start an emulator (replace with your AVD name)
emulator -avd Pixel_7_API_34
```

### 1.3 Verify Device is Online

```powershell
adb devices
```

**Important:** The device must show as `device` (not `offline` or `unauthorized`).

If device shows as `offline`:
- Wait a few seconds for emulator to fully boot
- Run `adb kill-server` then `adb start-server`
- Check again with `adb devices`

---

## Step 2: Flutter App - Debug Build

### 2.1 Build Debug APK

```powershell
cd mobile-app
flutter build apk --debug
```

**Expected output:**
```
✓ Built build\app\outputs\flutter-apk\app-debug.apk
```

### 2.2 Note the APK Path

The APK will be located at:
```
mobile-app\build\app\outputs\flutter-apk\app-debug.apk
```

**⚠️ Important:** Always use a **debug build** for Appium testing. Release builds may not allow VM service connection.

---

## Step 3: Appium 2 + Flutter Driver Installation

These commands are global; run them once from any directory.

### 3.1 Install / Update Appium 2

```powershell
npm install -g appium@latest
```

### 3.2 Install the Flutter driver

```powershell
appium driver install --source=npm appium-flutter-driver
```

### 3.3 Verify installation

```powershell
appium driver list
```

You should see `flutter` in the installed drivers list.

**Notes**
- Use **debug builds** so Appium can attach to the Dart VM service.
- Release builds usually block the connection and cause `Cannot connect to Flutter VM` errors.
- No extra Flutter plugin is required beyond enabling `flutter_driver` in `main.dart`.

---

## Step 4: Optional `.env` Overrides

`wdio.conf.js` supports a few environment variables via [dotenv](https://www.npmjs.com/package/dotenv).

```powershell
copy env.example .env
```

Edit `.env` if you need to override the defaults:

```env
# Emulator / device name reported by `adb devices`
ANDROID_DEVICE_NAME=emulator-5554

# Android version number (13, 14, ...)
ANDROID_PLATFORM_VERSION=13

# Absolute path to your debug APK
ANDROID_APP_PATH=C:\Users\you\Downloads\IT Center Project 2\mobile-app\build\app\outputs\flutter-apk\app-debug.apk

# Set true to keep sessions alive between runs
ANDROID_NO_RESET=false
```

---

## Step 5: Install Project Dependencies

Run from the `mobile-app` directory:

```powershell
npm install
```

This installs:
- `webdriverio` + WDIO CLI/services
- `appium-flutter-finder`
- `dotenv`
- Local scripts defined in `package.json`

---

## Step 6: Run Tests

### 6.1 Start Appium (Terminal 1)

```powershell
npx appium --allow-cors --relaxed-security --port 4723
```

Wait for `Appium REST http interface listener started on 0.0.0.0:4723`.

### 6.2 Run WDIO (Terminal 2)

```powershell
cd mobile-app
npm run test:android
```

This executes `wdio.conf.js`, which:
- Loads `.env` (optional overrides).
- Connects to the existing Appium server on port 4723.
- Runs the sample spec under `tests/specs/flutter-smoke.e2e.js`.

---

## Verification Steps

After completing all steps, verify the setup:

1. ✅ `adb devices` shows your emulator/device
2. ✅ `appium driver list` shows `flutter [installed]`
3. ✅ Debug APK exists at `build/app/outputs/flutter-apk/app-debug.apk`
4. ✅ Smoke spec passes: `npm run test:android`

If the sanity test passes, your setup is complete! 🎉

---

## Troubleshooting

If you encounter issues, see:
- [Appium Troubleshooting Guide](./appium-troubleshooting-flutter.md)

Common issues:
- **"Cannot connect to Flutter VM"** → Use debug build, not release
- **"Device offline"** → Restart ADB server, wait for emulator to fully boot
- **"Driver not found"** → Run `appium driver install flutter`
- **"Session creation failed"** → Check Appium server is running, verify capabilities in `.env`

---

## Quick Reference Commands

```powershell
# Check devices
adb devices

# Global driver list
appium driver list

# Build debug APK
flutter build apk --debug

# Start Appium
npx appium --allow-cors --relaxed-security --port 4723

# Run WDIO smoke test
npm run test:android
```

