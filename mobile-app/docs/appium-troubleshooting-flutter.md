# Appium Troubleshooting Guide for Flutter

This guide covers common errors and their solutions when running Appium tests with Flutter apps.

---

## Error: "WebDriverError: Could not create a new session. Connection refused / Could not proxy command to remote server"

### Symptoms
- Test fails immediately when trying to create a session
- Error mentions "Connection refused" or "remote server"
- Appium server might not be running

### Causes
1. Appium server is not running
2. Wrong URL/port in WebdriverIO config
3. Flutter driver not installed
4. Wrong driver name in capabilities

### Fixes

**1. Check Appium Server is Running**

```powershell
# Check if Appium is running on port 4723
netstat -an | findstr 4723
```

If not running, start it:
```powershell
appium --allow-cors --log-level debug
```

**2. Verify Flutter Driver is Installed**

```powershell
appium driver list
```

Should show:
```
- flutter@3.2.0 [installed (npm)]
```

If not installed, install it as an npm package:
```powershell
npm install -g appium-flutter-driver
```

**Note:** Do NOT use `appium driver install flutter` - that's for built-in drivers only. The Flutter driver is a separate npm package.

**3. Check Capabilities in wdio.appium.conf.ts**

Ensure `automationName` is set to `'Flutter'`:
```typescript
capabilities: [{
  'appium:automationName': 'Flutter',  // Must be 'Flutter'
  // ...
}]
```

**4. Restart Appium Server**

```powershell
# Kill any existing Appium processes
taskkill /F /IM node.exe  # Be careful - this kills all Node processes

# Or find and kill Appium specifically
Get-Process node | Where-Object {$_.Path -like "*appium*"} | Stop-Process

# Start fresh
appium --allow-cors --log-level debug
```

---

## Error: "Cannot connect to Flutter VM / Dart VM service" OR timeouts when starting session

### Symptoms
- Session creation starts but times out
- Error mentions "VM service" or "Dart VM"
- App launches but Appium cannot attach

### Causes
1. Using release build instead of debug build
2. Device/emulator network issues
3. Port forwarding problems
4. App already running from previous session

### Fixes

**1. Build and Use Debug APK**

```powershell
cd mobile-app
flutter build apk --debug
```

**⚠️ Critical:** Never use `--release` flag. Release builds don't expose the VM service.

**2. Uninstall Old App and Reinstall**

```powershell
# Uninstall the app
adb uninstall com.example.itcenter  # Replace with your package name

# Or uninstall via Appium (it will reinstall automatically)
```

**3. Restart Emulator**

```powershell
# Close emulator completely
# Restart from Android Studio or command line
emulator -avd Pixel_7_API_34
```

Wait for emulator to fully boot (home screen visible).

**4. Check ADB Connection**

```powershell
adb devices
# Should show: emulator-5554    device
```

If shows `offline`:
```powershell
adb kill-server
adb start-server
adb devices
```

**5. For Physical Devices: Check USB Debugging**

- Enable Developer Options on device
- Enable USB Debugging
- Authorize computer when prompted
- Check `adb devices` shows device as `device` (not `unauthorized`)

---

## Error: "Cannot execute command waitFor" or "Uncaught extension error while executing waitFor"

### Symptoms
- Test runs but fails when trying to wait for elements
- Error mentions "waitFor" command
- Flutter extension assertion errors

### Causes
1. Mixing old `flutter_driver` code in the app
2. App crashed or not fully initialized
3. Root widget not attached (app not started)

### Fixes

**1. Ensure No Old flutter_driver Code**

**⚠️ Important:** You should NOT have:
- `flutter_driver` package in `pubspec.yaml`
- `enableFlutterDriverExtension()` in `main.dart`
- Any `FlutterDriver` usage in the app code

The `appium-flutter-driver` works without these.

**2. Use appium-flutter-driver Correctly**

In your test code, use Flutter finders:
```typescript
const element = await $('flutter:byValueKey("my_key")');
await element.waitForDisplayed({ timeout: 30000 });
```

**3. Wait for App to Fully Load**

Add a delay or wait for a known element before interacting:
```typescript
// Wait for app to be ready
await browser.pause(3000);

// Or wait for a specific element
const homeElement = await $('flutter:byValueKey("home_screen")');
await homeElement.waitForDisplayed({ timeout: 30000 });
```

**4. Restart App and Rerun Test**

If app crashed:
```powershell
# Kill the app
adb shell am force-stop com.example.itcenter

# Rerun test (Appium will reinstall and start the app)
npm test
```

---

## Error: "A Dart VM Service on Chrome is available at: http://127.0.0.1:XXXX" but Appium still fails

### Symptoms
- Flutter debug output shows VM service URL
- But Appium cannot connect
- Session creation fails

### Causes
1. Another process using the port
2. Driver not configured as Flutter
3. App was started manually (not by Appium)
4. Multiple debug sessions conflicting

### Fixes

**1. Kill Any Running Flutter Sessions**

```powershell
# Kill any flutter run processes
taskkill /F /IM flutter.exe

# Or find and kill
Get-Process | Where-Object {$_.ProcessName -like "*flutter*"} | Stop-Process
```

**2. Let Appium Install and Start the App**

**⚠️ Important:** Don't run `flutter run` manually. Let Appium handle app installation and startup via the `app` capability.

**3. Ensure Only One Debug Session**

- Close any IDEs running the app (VS Code, Android Studio)
- Stop any `flutter run` commands
- Let Appium be the only process managing the app

**4. Verify Driver Configuration**

In `wdio.appium.conf.ts`:
```typescript
capabilities: [{
  'appium:automationName': 'Flutter',  // Must be exactly 'Flutter'
  'appium:app': './build/app/outputs/flutter-apk/app-debug.apk',
  // ...
}]
```

---

## Error: "WidgetsBinding.instance.isRootWidgetAttached || !command.requiresRootWidgetAttached': No root widget is attached; have you remembered to call runApp()?"

### Symptoms
- Flutter extension assertion error
- App seems to be running but commands fail
- Error mentions "root widget" or "runApp()"

### Causes
1. App crashed before `runApp()` completed
2. App is in a bad state
3. Timing issue - command executed too early

### Fixes

**1. Check App Actually Started**

Look at the emulator/device screen. Is the app visible and showing UI?

If not:
- App may have crashed
- Check logs: `adb logcat | findstr flutter`
- Restart app

**2. Add Proper Waits**

Wait for app to be fully initialized:
```typescript
// Wait for a known element that appears after runApp()
const homeScreen = await $('flutter:byValueKey("home_screen")');
await homeScreen.waitForDisplayed({ timeout: 30000 });
```

**3. Increase Timeouts**

In `wdio.appium.conf.ts`:
```typescript
waitforTimeout: 60000,  // Increase if needed
connectionRetryTimeout: 120000,
```

**4. Restart Everything**

```powershell
# Kill app
adb shell am force-stop com.example.itcenter

# Kill Appium
# (Stop the Appium server process)

# Restart emulator (optional but recommended)
# Close and reopen emulator

# Rebuild app
flutter clean
flutter build apk --debug

# Start fresh
npm test
```

---

## Error: Element Not Found / Timeout Waiting for Element

### Symptoms
- Test runs but cannot find elements
- Timeout errors when waiting for elements
- "Element not found" errors

### Causes
1. Wrong Flutter ValueKey
2. Element not yet rendered
3. Wrong screen/navigation state

### Fixes

**1. Verify Flutter ValueKey**

Check your Flutter code. Elements must have `ValueKey`:
```dart
TextField(
  key: ValueKey('booking_search_field'),
  // ...
)
```

**2. Use Correct Selector Format**

```typescript
// Correct
const element = await $('flutter:byValueKey("my_key")');

// Wrong
const element = await $('//android.widget.TextView[@text="My Text"]');  // Don't use XPath for Flutter
```

**3. Add Proper Waits**

```typescript
// Wait for element with timeout
const element = await $('flutter:byValueKey("my_key")');
await element.waitForDisplayed({ timeout: 30000 });
```

**4. Check Navigation State**

Ensure you're on the correct screen before looking for elements:
```typescript
await searchScreen.waitForLoaded();  // Wait for screen to load
await searchScreen.setCapacity(5);   // Then interact
```

---

## General Debugging Tips

### 1. Enable Verbose Logging

In `wdio.appium.conf.ts`, change log level:
```typescript
logLevel: 'debug',  // or 'info', 'warn', 'error'
```

### 2. Check Appium Logs

When running Appium manually:
```powershell
appium --allow-cors --log-level debug
```

Look for:
- Session creation messages
- Driver initialization
- Command execution
- Error stack traces

### 3. Check ADB Logs

```powershell
adb logcat | findstr flutter
```

Look for:
- App crashes
- Flutter errors
- VM service messages

### 4. Verify Environment Variables

```powershell
# Check .env file exists and has correct values
type .env

# Verify paths are correct (especially MOBILE_APP_PATH)
dir build\app\outputs\flutter-apk\app-debug.apk
```

### 5. Test Appium Connection Manually

```powershell
# Start Appium
appium --allow-cors --log-level debug

# In another terminal, test connection
curl http://localhost:4723/wd/hub/status
```

Should return JSON with Appium status.

---

## Still Having Issues?

1. **Check Appium Version**
   ```powershell
   appium --version
   ```
   Should be 2.x (e.g., 2.19.0)

2. **Check Flutter Driver Version**
   ```powershell
   appium driver list
   ```
   Should show latest flutter driver

3. **Verify All Dependencies**
   ```powershell
   npm list
   ```
   Check for missing or outdated packages

4. **Clean and Rebuild**
   ```powershell
   flutter clean
   flutter pub get
   flutter build apk --debug
   ```

5. **Check Project Documentation**
   - Review `appium-setup-checklist.md`
   - Check README.md for updates

6. **Get Help**
   - Check Appium logs for detailed error messages
   - Review Flutter app logs via `adb logcat`
   - Verify all steps in setup checklist were completed

