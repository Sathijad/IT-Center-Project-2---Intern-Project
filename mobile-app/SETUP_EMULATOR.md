# Fix: Install Android System Images for Emulator

## Problem
You're getting: "No suitable Android AVD system images are available"

## Solution: Install System Images

### Method 1: Using Android Studio (EASIEST - Recommended)

1. **Open Android Studio**
2. **Go to Tools → SDK Manager** (or click the SDK Manager icon in toolbar)
3. **Click on "SDK Platforms" tab**
4. **Check the box for:**
   - ✅ **Android 13.0 (Tiramisu)** - API Level 33
   - OR **Android 14.0** - API Level 34 (newer)
5. **Click "SDK Tools" tab**
6. **Make sure these are checked:**
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Command-line Tools
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator
   - ✅ Intel x86 Emulator Accelerator (HAXM installer) - for faster performance
7. **Click "Apply"** and let it download (this will take 5-10 minutes)
8. **Wait for installation to complete**

### Method 2: Using Command Line (Alternative)

#### Step 1: Find your Android SDK location

```powershell
# Common locations:
# $env:LOCALAPPDATA\Android\Sdk
# C:\Users\$env:USERNAME\AppData\Local\Android\Sdk

# Check if ANDROID_HOME is set
echo $env:ANDROID_HOME

# If not set, find it manually:
# Look in: C:\Users\YourUsername\AppData\Local\Android\Sdk
```

#### Step 2: Navigate to SDK tools

```powershell
# Replace with your actual SDK path
cd "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\cmdline-tools\latest\bin"
```

#### Step 3: List available system images

```powershell
.\sdkmanager.bat --list | Select-String "system-images"
```

#### Step 4: Install a system image

```powershell
# Install Android 13 (API 33) with Google APIs
.\sdkmanager.bat "system-images;android-33;google_apis;x86_64"

# OR for Android 14 (API 34)
.\sdkmanager.bat "system-images;android-34;google_apis;x86_64"
```

#### Step 5: Accept licenses (if prompted)

```powershell
.\sdkmanager.bat --licenses
# Type 'y' for each license agreement
```

### Method 3: Quick PowerShell Script

Run this script (it will help you install the system image):

```powershell
# Set Android SDK path (adjust if different)
$androidSdkPath = "$env:LOCALAPPDATA\Android\Sdk"

if (-not (Test-Path $androidSdkPath)) {
    Write-Host "Android SDK not found at: $androidSdkPath" -ForegroundColor Red
    Write-Host "Please install Android Studio first: https://developer.android.com/studio" -ForegroundColor Yellow
    exit 1
}

$sdkmanager = "$androidSdkPath\cmdline-tools\latest\bin\sdkmanager.bat"

if (-not (Test-Path $sdkmanager)) {
    Write-Host "SDK Manager not found. Installing command-line tools..." -ForegroundColor Yellow
    # Download command-line tools
    Write-Host "Please use Android Studio SDK Manager instead (Tools → SDK Manager)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Installing Android 13 (API 33) system image..." -ForegroundColor Cyan
& $sdkmanager "system-images;android-33;google_apis;x86_64"

Write-Host "Accepting licenses..." -ForegroundColor Cyan
& $sdkmanager --licenses

Write-Host "Done! Now you can create the emulator." -ForegroundColor Green
```

## After Installing System Images

### Create Emulator via Android Studio (Easiest)

1. Open **Android Studio**
2. Click **More Actions** → **Virtual Device Manager**
3. Click **+ Create Device**
4. Select device (e.g., **Pixel 5**)
5. Click **Next**
6. Now you should see the system image you installed
7. Select it and click **Next** → **Finish**

### Create Emulator via Command Line

```powershell
# List available system images
avdmanager list targets

# Create emulator (adjust API level if needed)
avdmanager create avd -n IT_EMPLOYEE -k "system-images;android-33;google_apis;x86_64"

# Or use Flutter command
flutter emulators --create --name IT_EMPLOYEE
```

## Quick Setup Steps Summary

1. ✅ Open Android Studio
2. ✅ Tools → SDK Manager
3. ✅ SDK Platforms → Check Android 13 (API 33)
4. ✅ SDK Tools → Make sure Android Emulator is checked
5. ✅ Apply → Wait for download
6. ✅ Device Manager → Create Device
7. ✅ Select device → Select system image → Finish
8. ✅ Launch emulator
9. ✅ Run `flutter run` in your project

## Troubleshooting

**Issue: "sdkmanager not found"**
- Install Android Studio and use its SDK Manager instead
- Or manually install command-line tools via Android Studio

**Issue: "License not accepted"**
```powershell
cd "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\cmdline-tools\latest\bin"
.\sdkmanager.bat --licenses
```

**Issue: "Emulator still slow"**
- Enable Hardware Acceleration in Android Studio
- Allocate more RAM (4GB+) in Device Manager settings

## Verify Installation

```powershell
# Check if system images are installed
avdmanager list targets

# Check Flutter setup
flutter doctor -v
```


