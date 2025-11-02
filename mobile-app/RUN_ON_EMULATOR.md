# Running Flutter App on Android Emulator

## Step-by-Step Guide

### Prerequisites Check

1. **Verify Flutter Installation**
   ```powershell
   flutter doctor
   ```
   Make sure you see:
   - ✅ Flutter (Channel stable)
   - ✅ Android toolchain
   - ✅ Android Studio (optional but recommended)

2. **Verify Android SDK is Installed**
   ```powershell
   flutter doctor -v
   ```
   Check that Android SDK is found.

### Step 1: Install Android Studio (if not installed)

1. Download Android Studio from: https://developer.android.com/studio
2. Install it with default settings
3. Open Android Studio and go through the setup wizard
4. Install Android SDK components when prompted

### Step 2: Set Up Android Emulator

**Option A: Using Android Studio (Recommended)**

1. Open **Android Studio**
2. Click on **More Actions** → **Virtual Device Manager** (or Tools → Device Manager)
3. Click **Create Device**
4. Select a device (e.g., **Pixel 5** or **Pixel 7**)
5. Click **Next**
6. Select a system image (e.g., **API 33** or **API 34** - latest stable)
   - If not downloaded, click **Download** next to the API level
7. Click **Next** → **Finish**

**Option B: Using Command Line**

1. List available system images:
   ```powershell
   flutter emulators
   ```
2. Create an emulator:
   ```powershell
   # First, check available AVDs
   flutter emulators --create --name my_android_emulator
   ```

### Step 3: Start the Android Emulator

**Using Android Studio:**
- Open **Device Manager** in Android Studio
- Click the **Play** ▶️ button next to your emulator

**Using Command Line:**
```powershell
# List available emulators
flutter emulators

# Launch the emulator (replace with your emulator name)
flutter emulators --launch <emulator_id>
```

Example:
```powershell
flutter emulators --launch Pixel_5_API_33
```

### Step 4: Verify Emulator is Running

```powershell
flutter devices
```

You should see output like:
```
2 connected devices:

sdk gphone64 arm64 (mobile) • emulator-5554 • android-arm64 • Android 13 (API 33)
Chrome (web)                • chrome        • web-javascript • Google Chrome 120.0.0.0
```

### Step 5: Navigate to Mobile App Directory

```powershell
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2\mobile-app"
```

### Step 6: Get Dependencies

```powershell
flutter pub get
```

### Step 7: Run on Android Emulator

```powershell
flutter run
```

Or specify the Android device explicitly:
```powershell
flutter run -d android
```

Or if you have multiple devices:
```powershell
flutter run -d emulator-5554
```

### Troubleshooting

#### Issue: "No connected devices"
**Solution:**
1. Make sure emulator is running
2. Enable USB debugging if using a physical device
3. Run `flutter doctor` to check setup

#### Issue: "SDK location not found"
**Solution:**
```powershell
# Set Android SDK path (adjust to your installation)
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
```

#### Issue: "Gradle build failed"
**Solution:**
1. Check your internet connection
2. Clean and rebuild:
   ```powershell
   cd android
   .\gradlew clean
   cd ..
   flutter clean
   flutter pub get
   flutter run
   ```

#### Issue: Emulator is slow
**Solution:**
1. Enable hardware acceleration in Android Studio
2. Allocate more RAM to the emulator (4GB+ recommended)
3. Close other heavy applications

### Quick Commands Reference

```powershell
# Check available devices
flutter devices

# List emulators
flutter emulators

# Launch specific emulator
flutter emulators --launch <emulator_id>

# Run on emulator
flutter run

# Run with hot reload enabled (default)
flutter run --hot

# Run in release mode (faster, but no hot reload)
flutter run --release

# Stop the app
# Press 'q' in the terminal or stop from Android Studio
```

### Expected Behavior

1. **First Run:** May take 2-5 minutes to build
2. **Subsequent Runs:** Much faster with hot reload
3. **Hot Reload:** Press `r` in terminal to reload, `R` for full restart
4. **App should:** Open on emulator showing the login screen

### Tips

- Keep the terminal running - it shows logs and allows hot reload
- Use `flutter run --verbose` for detailed logs if issues occur
- The first build can take time - be patient
- Make sure you have at least 8GB RAM free for smooth emulator performance

