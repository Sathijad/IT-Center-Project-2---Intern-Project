# E2E Test Setup Guide

This guide explains how to build and run E2E tests for the mobile app with all the fixes applied.

## Problem Solved

**Previous Issue:** The app was crashing on launch because:
- Amplify/Cognito initialization was failing
- AuthGate was blocking on network calls
- Appium couldn't maintain a stable session

**Solution:** 
- Added `E2E_TEST` compile-time flag to bypass Amplify initialization
- Modified AuthGate to immediately show login screen in test mode
- Added ValueKeys to all login form elements
- Improved Appium capabilities for stability
- Added `waitForFirstFrame` to prevent premature app close

---

## Step 1: Build APK with E2E_TEST Flag

**IMPORTANT:** You MUST build the APK with the `E2E_TEST=true` flag, otherwise the app will still try to initialize Amplify and crash.

```powershell
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2\mobile-app"

# Clean previous build
flutter clean

# Build APK with E2E_TEST flag
flutter build apk --debug --dart-define=E2E_TEST=true
```

The APK will be at: `build/app/outputs/flutter-apk/app-debug.apk`

---

## Step 2: Verify APK Exists

```powershell
Test-Path "build\app\outputs\flutter-apk\app-debug.apk"
# Should return: True
```

---

## Step 3: Start Android Emulator

```powershell
# List available emulators
emulator -list-avds

# Start an emulator (replace <AVD_NAME> with your AVD)
emulator -avd Pixel_5 -netdelay none -netspeed full

# Wait for it to boot, then verify:
adb devices
adb shell getprop sys.boot_completed
# Should return: 1
```

---

## Step 4: Start Appium Server

**Open a separate PowerShell terminal** and run:

```powershell
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2\mobile-app"

# If Appium is not installed or wrong version:
npm uninstall -g appium
npm install -g appium@2.19.0
appium driver install flutter
appium driver install uiautomator2

# Start Appium server
appium --base-path /wd/hub --log-level debug
```

**Keep this terminal open** - Appium must stay running!

---

## Step 5: Set Environment Variables and Run Tests

**Open another PowerShell terminal** and run:

```powershell
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2\mobile-app"

# Set credentials
$env:USER_EMAIL="user@test.com"
$env:USER_PASSWORD="Admin@123"

# Optional: If you want to automate MFA (not recommended, use manual entry)
# $env:MFA_CODE="123456"

# Run login tests
npm run mobile:test:login

# Or run all tests
npm run mobile:test
```

---

## What Happens During Test

1. **App Launch:** App launches and immediately shows login screen (no Amplify init, no crash)
2. **Sign In Button:** Test taps the "Sign In" button (has `ValueKey('sign_in_button')`)
3. **Hosted UI:** Webview opens with Cognito Hosted UI
4. **Credentials:** Test automatically fills email and password from env vars
5. **MFA (Manual):** 
   - If `MFA_CODE` is NOT set → Test waits up to 3 minutes for you to manually enter MFA code
   - If `MFA_CODE` IS set → Test automatically enters it
6. **Verification:** After login, test switches back to Flutter and verifies dashboard appears

---

## ValueKeys Added

All form elements now have ValueKeys for Appium:

- `login_email` - Email text field
- `login_password` - Password text field  
- `sign_in_button` - Sign In button
- `mfa_code` - MFA code input field
- `mfa_submit` - MFA submit button

These are used in the test helpers: `findElementByKey()`, `tapElement()`, `enterText()`

---

## Troubleshooting

### App Still Crashes on Launch

1. **Verify APK was built with E2E_TEST flag:**
   ```powershell
   flutter build apk --debug --dart-define=E2E_TEST=true
   ```

2. **Check if old APK exists without flag:**
   ```powershell
   Remove-Item "build\app\outputs\flutter-apk\app-debug.apk" -ErrorAction SilentlyContinue
   flutter build apk --debug --dart-define=E2E_TEST=true
   ```

3. **Check logcat for crash details:**
   ```powershell
   adb logcat -c
   adb logcat *:E flutter:E AndroidRuntime:E | findstr /R /C:"com.example.itcenter_auth"
   ```

### App Opens Then Immediately Closes

- **Check Appium server is running** on port 4723
- **Check emulator is fully booted:** `adb shell getprop sys.boot_completed` should return `1`
- **Wait for first frame:** The test now includes `flutter:waitForFirstFrame` - check if it logs success

### "Session is not known" Errors

- **Restart Appium server** cleanly
- **Kill any stuck processes:**
  ```powershell
  taskkill /F /IM node.exe /T
  adb kill-server
  adb start-server
  ```

### MFA Not Working

- **Manual entry:** Don't set `MFA_CODE` env var - you'll see prompt to enter manually
- **Automated:** Set `$env:MFA_CODE="123456"` before running tests
- **Timeout:** Test waits up to 3 minutes for manual MFA entry

---

## Testing Different Features

### Login Tests Only
```powershell
npm run mobile:test:login
```

### Profile Tests Only
```powershell
npm run mobile:test:profile
```

### Roles Tests Only
```powershell
npm run mobile:test:roles
```

### All Tests
```powershell
npm run mobile:test
```

---

## Important Notes

1. **Always build with `--dart-define=E2E_TEST=true`** - Without this flag, the app will crash trying to initialize Amplify
2. **Appium v2.x required** - Version 3.x has compatibility issues with Flutter driver
3. **Emulator must be fully booted** - Wait until `adb shell getprop sys.boot_completed` returns `1`
4. **Appium must stay running** - Keep the Appium server terminal open while tests run
5. **ValueKeys are required** - The tests use `ValueKey()` to find elements, make sure they're in the Flutter code

---

## Files Modified

1. `lib/main.dart` - Added E2E_TEST flag, bypass Amplify init, immediate login screen
2. `lib/src/auth_service.dart` - Skip Amplify init when E2E_TEST=true
3. `lib/src/login_screen.dart` - Added ValueKeys to all form elements
4. `tests/mobile/helpers/driver.ts` - Improved capabilities for stability
5. `tests/mobile/login.spec.ts` - Added waitForFirstFrame, automated Hosted UI login

---

## Quick Reference

```powershell
# 1. Build APK
flutter clean
flutter build apk --debug --dart-define=E2E_TEST=true

# 2. Start Emulator (separate terminal)
emulator -avd Pixel_5

# 3. Start Appium (separate terminal)
appium --base-path /wd/hub

# 4. Run Tests (separate terminal)
$env:USER_EMAIL="user@test.com"
$env:USER_PASSWORD="Admin@123"
npm run mobile:test:login
```

---

## Success Indicators

✅ App launches without crashing  
✅ Login screen appears immediately  
✅ Test logs: `✅ Flutter first frame ready`  
✅ Hosted UI opens after tapping Sign In  
✅ Credentials are filled automatically  
✅ MFA can be entered manually or automatically  
✅ Dashboard appears after successful login  

