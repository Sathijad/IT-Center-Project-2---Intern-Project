# Next Steps After Installing System Images

## ✅ You've completed: Installing Android System Images
## 🎯 Next: Create and Run Your Emulator

---

## Step 1: Create the Emulator

### Option A: Using Android Studio (EASIEST)

1. **In Android Studio, click "More Actions" → "Virtual Device Manager"**
   - Or go to: **Tools → Device Manager**

2. **Click "+ Create Device"** button (top left)

3. **Select a Device:**
   - Choose: **Pixel 5** (recommended) or **Pixel 7**
   - Click **Next**

4. **Select System Image:**
   - You should now see **Android 13.0 (Tiramisu)** or **Android 14.0**
   - If you see a "Download" button, click it first
   - Select the system image you just installed
   - Click **Next**

5. **Configure AVD (if shown):**
   - Leave defaults or adjust RAM (4GB+ recommended)
   - Click **Finish**

6. **Your emulator is now created!** ✅

### Option B: Using Command Line

```powershell
# Navigate to mobile-app folder
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2\mobile-app"

# Create emulator with the installed system image
flutter emulators --create --name IT_EMPLOYEE
```

If this gives an error, use Android Studio method instead.

---

## Step 2: Launch the Emulator

### Using Android Studio:
1. In **Device Manager**, find your newly created emulator
2. Click the **▶️ Play** button next to it
3. Wait for emulator to boot (30-60 seconds)

### Using Command Line:
```powershell
# List available emulators
flutter emulators

# Launch your emulator (replace with your actual name)
flutter emulators --launch IT_EMPLOYEE
```

---

## Step 3: Verify Emulator is Running

```powershell
flutter devices
```

You should see something like:
```
2 connected devices:

sdk gphone64 arm64 (mobile) • emulator-5554 • android-arm64 • Android 13 (API 33)
Chrome (web)                • chrome        • web-javascript • Google Chrome
```

If you see your Android emulator listed, you're ready! ✅

---

## Step 4: Run Your Flutter App

```powershell
# Make sure you're in the mobile-app directory
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2\mobile-app"

# Get dependencies (if not done already)
flutter pub get

# Run the app on the emulator
flutter run
```

**Or use the helper script:**
```powershell
.\run-android-emulator.ps1
```

---

## Step 5: Test Your App

Once `flutter run` completes:
- ✅ Your app should open on the emulator
- ✅ You should see the login screen
- ✅ Press `r` in terminal for hot reload
- ✅ Press `q` to quit

---

## Quick Command Reference

```powershell
# Check available devices
flutter devices

# List emulators
flutter emulators

# Launch emulator
flutter emulators --launch IT_EMPLOYEE

# Run app
flutter run

# Run app on specific device
flutter run -d emulator-5554
```

---

## Troubleshooting

**Emulator won't start?**
- Make sure hardware acceleration is enabled
- Try creating a new emulator with more RAM (4GB+)

**App won't run?**
- Make sure emulator is fully booted (wait for home screen)
- Run `flutter doctor` to check setup
- Run `flutter clean` then `flutter pub get`

**Slow performance?**
- Allocate more RAM to emulator (Device Manager → Edit → Show Advanced Settings)
- Close other applications

---

## Summary Checklist

- [x] ✅ Installed Android system images
- [ ] ⏭️ Create emulator (Android Studio → Device Manager)
- [ ] ⏭️ Launch emulator
- [ ] ⏭️ Verify: `flutter devices`
- [ ] ⏭️ Run app: `flutter run`
- [ ] ⏭️ Test login functionality

**You're almost there! Just create and launch the emulator now!** 🚀


