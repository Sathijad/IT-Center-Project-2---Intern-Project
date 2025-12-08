# Appium Testing - Phase 7 Feedback Tests

## Quick Start

### Option 1: Auto-start Appium (Recommended)
WebdriverIO will automatically start Appium when you run the tests:
```powershell
npx wdio run wdio.single.conf.js --spec .\test\specs\phase7_feedback_list.spec.js
```

**Note**: Appium may take 30-60 seconds to start on the first run. Be patient!

### Option 2: Manual Appium Start (If auto-start fails)
If Appium times out during auto-start, start it manually first:

1. **Start Appium in a separate terminal:**
   ```powershell
   cd mobile-app/appium_flutter_test
   .\start-appium.ps1
   ```
   Or manually:
   ```powershell
   $env:APPIUM_HOME = (Get-Location).Path
   appium --base-path / --relaxed-security --port 4723
   ```

2. **Wait for Appium to start** (you'll see "Appium REST http interface listener started on 0.0.0.0:4723")

3. **In another terminal, run the test:**
   ```powershell
   npx wdio run wdio.single.conf.js --spec .\test\specs\phase7_feedback_list.spec.js
   ```

4. **Update the config** to connect to existing instance:
   - Edit `wdio.single.conf.js`
   - Change `services: [...]` to `services: []`

## Prerequisites

1. **Android Emulator Running:**
   ```powershell
   adb devices
   # Should show: emulator-5554    device
   ```

2. **APK Built:**
   ```powershell
   cd mobile-app
   flutter build apk --debug
   ```

3. **Appium Drivers Installed:**
   ```powershell
   npx appium driver list
   # Should show: uiautomator2@6.6.2 [installed]
   ```

## Test Files

- `test/specs/phase7_feedback_list.spec.js` - Main feedback list test
- `test/specs/phase7_submit_feedback.spec.js` - Submit feedback test
- `test/specs/phase7_feedback_detail.spec.js` - Feedback detail test
- `test/specs/phase7_complete_feedback_flow.spec.js` - Complete flow test

## Troubleshooting

### Appium Timeout Error
**Error**: `Timeout: Appium did not start within expected time`

**Solutions**:
1. Start Appium manually first (see Option 2 above)
2. Increase timeout in `wdio.single.conf.js`: `waitStartTimeout: 300000` (5 minutes)
3. Check if port 4723 is already in use: `netstat -ano | findstr :4723`

### Connection Refused
**Error**: `Request failed with error code ECONNREFUSED`

**Solutions**:
1. Make sure Appium is running: `Test-NetConnection -ComputerName localhost -Port 4723`
2. Check if another Appium instance is running on a different port
3. Restart Appium

### Element Not Found
**Error**: `element still not displayed after 10000ms`

**Solutions**:
1. Check if the app is actually running on the emulator
2. Use Appium Inspector to verify element selectors
3. Increase wait time in test: `waitForDisplayed({ timeout: 20000 })`
4. Check Android logs: `adb logcat | Select-String -Pattern "flutter|error"`

### App Closes After Login
**Symptoms**: Email/password typed, but app closes after clicking Sign In

**Solutions**:
1. Check Android logcat for crashes: `adb logcat -c; adb logcat | Select-String -Pattern "FATAL|Exception"`
2. Verify backend API is running and accessible
3. Check network connectivity from emulator
4. Verify credentials are correct: `user@test.com` / `Admin@123`

## Configuration

### Test Credentials
- Email: `user@test.com`
- Password: `Admin@123`

### Emulator Settings
- Device: `emulator-5554`
- Platform: Android 13
- Automation: UiAutomator2

### App Path
Update in `wdio.single.conf.js` if your APK path is different:
```javascript
"appium:app": "C:/Users/YourName/.../app-debug.apk"
```

