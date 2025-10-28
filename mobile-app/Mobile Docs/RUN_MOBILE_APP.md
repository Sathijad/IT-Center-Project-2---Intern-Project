# Running Flutter App on Mobile Device 📱

This guide will help you run the IT Center mobile app on an actual mobile interface instead of in the browser.

## Prerequisites

1. ✅ Flutter SDK installed
2. ✅ Android Studio or Android SDK installed
3. ✅ Android Emulator set up OR physical device connected

## Option 1: Using Android Emulator (Recommended)

### Step 1: Check Available Emulators
```powershell
cd mobile-app
flutter emulators
```

You should see available emulators. If there are none, create one using Android Studio.

### Step 2: Launch the Emulator
```powershell
flutter emulators --launch <emulator_id>
```

Wait 1-2 minutes for the emulator to fully boot up.

### Step 3: Verify Device is Connected
```powershell
flutter devices
```

Wait until you see the Android device status as "online" (not "offline").

### Step 4: Run the App
```powershell
flutter run -d <device_id>
```

Or simply:
```powershell
flutter run -d android
```

### Step 5: Wait for Build to Complete
- First build may take 3-5 minutes
- The app will automatically launch on the emulator

---

## Option 2: Using a Physical Android Device

### Step 1: Enable Developer Options on Your Phone
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times
3. Developer options will be enabled

### Step 2: Enable USB Debugging
1. Go to **Settings** → **Developer Options**
2. Enable **USB Debugging**
3. Enable **Install via USB**

### Step 3: Connect Your Phone
1. Connect phone to computer via USB
2. On your phone, allow the USB debugging prompt

### Step 4: Verify Connection
```powershell
flutter devices
```

You should see your device listed.

### Step 5: Run the App
```powershell
flutter run -d <device_id>
```

---

## Troubleshooting

### Emulator is "Offline"
- **Solution**: Wait longer (up to 2-3 minutes for first boot)
- Keep checking: `flutter devices`

### No Devices Found
- **Solution**: Make sure emulator is running OR device is connected
- Check: `adb devices` (Android Debug Bridge)

### Build Errors
- **Solution**: Clean and rebuild
  ```powershell
  flutter clean
  flutter pub get
  flutter run
  ```

### App Installs But Doesn't Run
- Make sure the backend is running:
  ```powershell
  cd auth-backend
  ./start.bat
  ```

---

## Quick Commands

```powershell
# List available devices
flutter devices

# Run on Android
flutter run -d android

# Run on specific device
flutter run -d <device-id>

# Hot reload (while app is running)
# Press 'r' in terminal

# Hot restart (while app is running)
# Press 'R' in terminal

# Quit app
# Press 'q' in terminal
```

---

## Important Notes

1. **First Build**: The first build can take 3-5 minutes. Be patient!
2. **Hot Reload**: After the first build, changes reload quickly
3. **Backend Required**: Make sure your backend is running on `localhost:8080`
4. **Network**: The emulator can access `localhost` on your PC, but physical devices need actual IP address

---

## For Physical Devices (Advanced)

If you're testing on a physical device over WiFi (not USB), you'll need to:

1. Find your computer's IP address:
   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. Update the API configuration in your mobile app to use your computer's IP

---

## Ready to Run! 🚀

Once your emulator/device is ready, simply run:
```powershell
cd mobile-app
flutter run -d android
```

The app will install and launch automatically on your mobile device! 📱

