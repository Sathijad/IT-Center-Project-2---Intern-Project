# Cognito Mobile App Setup Instructions

## Overview
This Flutter mobile app integrates with AWS Cognito using Amplify SDK v2.4.2 for authentication via Hosted UI with PKCE flow.

## Important Configuration Steps

### 1. Install Dependencies
```bash
cd mobile-app
flutter pub get
```

### 2. Configure Amplify
✅ **Already configured!** The app uses the same Cognito credentials as the web admin app:
- User Pool ID: `ap-southeast-2_hTAYJId8y`
- App Client ID: `3rdnl5ind8guti89jrbob85r4i`
- Domain: `itcenter-auth.auth.ap-southeast-2.amazoncognito.com`

### 3. Enable Windows Developer Mode (If you get symlink errors)
If you encounter "Building with plugins requires symlink support" error:

**Option 1 - Via Settings:**
1. Open Settings (press `Windows + I`)
2. Go to **Privacy & Security** → **For developers**
3. Toggle **ON** "Developer Mode"
4. Restart your terminal

**Option 2 - Via PowerShell (Run as Administrator):**
```powershell
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name "AllowDevelopmentWithoutDevLicense" -Value 1
```

### 4. Create Android/iOS Platform Folders
Since this project currently only has Windows support, you need to add Android and iOS support:

```bash
# Add Android support (already done!)
flutter create --platform=android .

# Add iOS support (if on macOS)
flutter create --platform=ios .
```

### 5. Android Deep-link Configuration
✅ **Already configured!** Deep links have been added to `android/app/src/main/AndroidManifest.xml`:

The following intent filters are already in place:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" android:host="auth" />
</intent-filter>
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" android:host="signout" />
</intent-filter>
```

### 6. iOS Deep-link Configuration
After creating the iOS platform, edit `ios/Runner/Info.plist`:

Add this inside the `<dict>` tag (before the closing `</dict>`):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

### 7. Cognito App Client Setup (One-time in AWS Console)

Add mobile callback URIs to your existing app client (`3rdnl5ind8guti89jrbob85r4i`):

1. **Update the existing App Client** in AWS Cognito Console:
   - Go to AWS Cognito Console → Your User Pool (`ap-southeast-2_hTAYJId8y`)
   - Find App Client: `3rdnl5ind8guti89jrbob85r4i`
   - Edit Hosted UI configuration
   - **Add to Callback URLs**: `myapp://auth` (keep existing `http://localhost:5173/auth/callback`)
   - **Add to Sign-out URLs**: `myapp://signout` (keep existing `http://localhost:5173`)
   - Ensure **Authorization code grant** and **PKCE** are enabled
   - Ensure **Allowed OAuth Scopes** includes: `openid`, `email`, `profile`

2. **Optional MFA Setup**:
   - In User Pool → "MFA and verifications"
   - Enable SMS and/or TOTP
   - Allow users to choose MFA method

### 8. Backend Configuration
The app calls `http://localhost:8080/api/v1/me` with a Bearer token (matches web admin app).

**For Android Emulator**: Change `http://localhost:8080` to `http://10.0.2.2:8080` in `lib/src/home_screen.dart`

**For Physical Device**: Use your computer's IP address (e.g., `http://192.168.1.X:8080`)

### 9. Test the App

Run the app:
```bash
flutter run
```

## What Works Now

✅ Hosted UI Sign-in with PKCE  
✅ Registration flow (sign-up + confirmation)  
✅ Password reset flow  
✅ MFA handled by Cognito Hosted UI  
✅ Backend API calls with Access Token  
✅ Automatic session management  

## Architecture

- **lib/main.dart**: Entry point with AuthGate
- **lib/src/auth_service.dart**: Amplify authentication service
- **lib/src/login_screen.dart**: Login UI with Hosted UI button
- **lib/src/register_sheet.dart**: Registration modal
- **lib/src/reset_sheet.dart**: Password reset modal
- **lib/src/home_screen.dart**: Main authenticated screen with backend API calls

## Notes

- This is an employee-only app (no role management)
- Admins can monitor activity in the web app via audit logs
- Backend validates JWTs using the same Cognito JWKS endpoint
- Session is persisted by Amplify SDK
- MFA challenges are handled in Cognito's Hosted UI

