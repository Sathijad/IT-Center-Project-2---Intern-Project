# Enable Developer Mode on Windows

## The Problem
Flutter requires symlink support to build apps on Windows. This requires Developer Mode to be enabled.

## The Solution (3 Easy Steps)

### Step 1: Developer Settings Should Be Open
You should now see a Windows Settings window. If not, run:
```powershell
start ms-settings:developers
```

### Step 2: Enable Developer Mode
In the Settings window:
1. Find **"For developers"** section
2. Under **"Use developer features"**, look for **"Developer Mode"**
3. Toggle it to **ON**
4. You may need to confirm by clicking "Yes" in a dialog

### Step 3: Restart Your Terminal
After enabling Developer Mode:
1. Close your current terminal/PowerShell window
2. Open a new terminal/PowerShell
3. Navigate back to the mobile-app directory
4. Run the Flutter app again

---

## Verify It's Working

After enabling Developer Mode and opening a new terminal:

```powershell
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2\mobile-app"
flutter run
```

---

## Alternative: If You Can't Enable Developer Mode

If you don't have administrator rights or can't enable Developer Mode, you can run the app on an **Android emulator** instead, which doesn't require symlink support:

```powershell
# Wait for emulator to be ready
flutter devices

# Run on Android
flutter run -d android
```

---

## What's Happening?

- **Windows Developer Mode**: Allows symlink creation without administrator rights
- **Symlinks needed**: Flutter plugins use symlinks during the build process
- **One-time setup**: Once enabled, you won't need to do this again

---

## Need Help?

If you see any errors, let me know! The most common issue is forgetting to restart the terminal after enabling Developer Mode.

