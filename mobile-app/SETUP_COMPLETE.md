# Mobile App Setup - Complete ✅

## What's Been Done

### ✅ Configuration Complete
1. **Amplify Configuration** (`lib/amplifyconfiguration.dart`)
   - User Pool ID: `ap-southeast-2_hTAYJId8y`
   - App Client ID: `3rdnl5ind8guti89jrbob85r4i` (same as web app)
   - Domain: `itcenter-auth.auth.ap-southeast-2.amazoncognito.com`
   - Deep link callbacks: `myapp://auth` and `myapp://signout`

2. **Dependencies Updated** (`pubspec.yaml`)
   - Amplify SDK v2.6.1 (upgraded from v1.4.9)
   - Added `http` package for API calls
   - Removed old `dio` dependency

3. **Authentication Structure**
   - `lib/src/auth_service.dart` - Amplify auth service
   - `lib/src/login_screen.dart` - Hosted UI login
   - `lib/src/register_sheet.dart` - Registration modal
   - `lib/src/reset_sheet.dart` - Password reset modal
   - `lib/src/home_screen.dart` - Main screen with backend API calls
   - Updated `lib/main.dart` with new auth flow

4. **Android Platform** 
   - ✅ Android platform created
   - ✅ Deep links configured in `android/app/src/main/AndroidManifest.xml`
   - ✅ Intent filters for `myapp://auth` and `myapp://signout` added

### ⚠️ Developer Mode Still Needed

If you get "symlink support" errors when building, enable Developer Mode:

**Quick Method (Settings):**
1. Press `Windows + I`
2. Go to **Privacy & Security** → **For developers**
3. Toggle ON "Developer Mode"
4. Restart terminal

**Alternative (PowerShell as Admin):**
```powershell
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name "AllowDevelopmentWithoutDevLicense" -Value 1
```

## What You Need to Do

### 1. Enable Developer Mode (if building fails with symlink error)
See above ⚠️ section

### 2. Update AWS Cognito Console
Add mobile callback URIs to your existing app client:

1. Go to [AWS Cognito Console](https://console.aws.amazon.com/cognito/)
2. Navigate to User Pool: `ap-southeast-2_hTAYJId8y`
3. Find App Client: `3rdnl5ind8guti89jrbob85r4i`
4. Click "Edit"
5. Under **Hosted UI settings**, **Callback URLs**:
   - Add: `myapp://auth`
   - Keep existing: `http://localhost:5173/auth/callback`
6. Under **Sign-out URLs**:
   - Add: `myapp://signout`  
   - Keep existing: `http://localhost:5173`
7. Save changes

### 3. Test the App

```bash
cd mobile-app

# Run on Windows
flutter run -d windows

# Run on Android (requires emulator or connected device)
flutter run -d android

# Run on Chrome web
flutter run -d chrome
```

## Testing Backend Connection

The app is configured to call `http://localhost:8080/api/v1/me`.

**Important for Android Emulator**: Change the URL in `lib/src/home_screen.dart`:
- From: `http://localhost:8080/api/v1/me`
- To: `http://10.0.2.2:8080/api/v1/me`

**For Physical Device**: Use your computer's IP address (e.g., `http://192.168.1.100:8080/api/v1/me`)

## Architecture

```
lib/
├── main.dart                    # Entry with AuthGate
├── amplifyconfiguration.dart    # Cognito config
└── src/
    ├── auth_service.dart        # Amplify auth wrapper
    ├── login_screen.dart        # Hosted UI login
    ├── register_sheet.dart      # Email sign-up + confirm
    ├── reset_sheet.dart         # Password reset flow
    └── home_screen.dart         # Authenticated screen (calls backend)
```

## Features Available

- ✅ Cognito Hosted UI sign-in (PKCE)
- ✅ User registration with email confirmation
- ✅ Password reset flow
- ✅ MFA handled by Cognito UI
- ✅ Backend API calls with Bearer token
- ✅ Session persistence
- ✅ Deep-link callbacks for authentication
- ✅ Same User Pool as web admin app

## Next Steps

1. Enable Developer Mode in Windows settings
2. Update Cognito callback URLs in AWS Console
3. Run `flutter run` to test
4. Configure backend URL for your testing environment (Android emulator or physical device)
5. Test login, registration, and backend API calls

The mobile app is now ready to use with your existing Cognito setup! 🎉

