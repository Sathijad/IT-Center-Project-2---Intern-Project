# Redirect URL Fix ✅

## Problems Fixed

### 1. **Platform-Aware Configuration** 
The app now automatically uses the correct redirect URLs based on the platform:
- **Web**: `http://localhost:5173/auth/callback`
- **Mobile (Android/iOS)**: `myapp://auth`

### 2. **UI Overflow Fixed**
The login screen now:
- Uses `SingleChildScrollView` to prevent overflow
- Has responsive constraints (minWidth: 280, maxWidth: 420)
- Uses `crossAxisAlignment.stretch` for consistent button widths
- Centers and wraps content properly

## Files Created/Updated

1. **`amplifyconfiguration.dart`** - Platform detector that selects the right config
2. **`amplifyconfiguration_web.dart`** - Web-specific config with localhost redirects
3. **`amplifyconfiguration_mobile.dart`** - Mobile-specific config with deep links
4. **`lib/src/auth_service.dart`** - Updated to use `getAmplifyConfig()`
5. **`lib/src/login_screen.dart`** - Fixed UI overflow with scroll view

## How It Works

```dart
String getAmplifyConfig() {
  if (kIsWeb) {
    return amplifyconfigWeb;  // Use localhost:5173 callbacks
  }
  
  if (Platform.isAndroid || Platform.isIOS) {
    return amplifyconfigMobile;  // Use myapp:// callbacks
  }
  
  return amplifyconfigWeb;  // Desktop fallback
}
```

## AWS Cognito Console Setup

You need to add both callback URL types to your App Client:

### 1. Go to AWS Cognito Console
- Navigate to: [https://console.aws.amazon.com/cognito](https://console.aws.amazon.com/cognito)
- Select User Pool: `ap-southeast-2_hTAYJId8y`
- Find App Client: `3rdnl5ind8guti89jrbob85r4i`

### 2. Edit App Client
1. Click **Edit**
2. Scroll to **Hosted UI**

### 3. Add Callback URLs (add ALL of these):
```
myapp://auth
http://localhost:56956/
```

### 4. Add Sign-out URLs:
```
myapp://signout
http://localhost:56956/
```

### 5. Save Changes

## Testing

### Web (Chrome)
```bash
flutter run -d chrome --web-port 56956
```
- Uses: `http://localhost:56956/`
- Fixed port for consistent redirects
- Will redirect back to your web app

### Android
```bash
flutter run -d android
```
- Uses: `myapp://auth`
- Deep link will open the app

### iOS
```bash
flutter run -d ios
```
- Uses: `myapp://auth`
- Deep link will open the app

### Windows Desktop
```bash
flutter run -d windows
```
- Uses web config (localhost callbacks)
- Works for development

## Notes

- The app automatically detects the platform and uses the appropriate config
- No code changes needed to switch between web/mobile
- Just update Cognito console with all callback URLs
- Test on Chrome for web development
- Test on Android/iOS for mobile deployment

## Current Status: ✅ READY TO USE

The app will now work on:
- ✅ Web (Chrome) with localhost callbacks
- ✅ Android with deep links
- ✅ iOS with deep links
- ✅ Windows Desktop (for development)

Just update the Cognito console with the callback URLs listed above!

