# Web Testing - Fixed Port Setup ✅

## Fixed Port Configuration

The web app is now configured to use **fixed port 56956** to prevent Cognito redirect errors.

## How to Run

### Web (Chrome) - Use Fixed Port
```bash
flutter run -d chrome --web-port 56956
```

This ensures:
- ✅ Consistent redirect URL every time
- ✅ No random port changes
- ✅ Matches Cognito configuration

## AWS Cognito Console Setup

Add these **exact URLs** to your App Client (`3rdnl5ind8guti89jrbob85r4i`):

### Callback URLs:
```
http://localhost:56956/
myapp://auth
```

### Sign-out URLs:
```
http://localhost:56956/
myapp://signout
```

**Note:** Include the trailing slash (`/`) for web URLs!

## Why Fixed Port?

Flutter Web picks a random port by default (e.g., 62364, 56956), but AWS Cognito requires **exact URL matching**. By fixing the port to 56956:

- ✅ Same URL every run
- ✅ No need to update Cognito each time
- ✅ Works with Amplify Hosted UI

## Platform-Aware Config

The app automatically selects the right config:
- **Web**: Uses `http://localhost:56956/`
- **Android/iOS**: Uses `myapp://auth`

No code changes needed - just run with the fixed port flag!

## Testing Checklist

1. ✅ Update Cognito with URLs above
2. ✅ Run: `flutter run -d chrome --web-port 56956`
3. ✅ Click "Sign In" button
4. ✅ Should redirect to Cognito Hosted UI
5. ✅ After sign-in, should redirect back to app

## Alternative Ports

If port 56956 is in use, you can use any port:
```bash
flutter run -d chrome --web-port 8080
```

Just update the URLs in:
1. `amplifyconfiguration_web.dart` (change `http://localhost:56956/` to your port)
2. Cognito Console (add the new URL)

## Summary

✅ **Fixed port configuration**: Port 56956  
✅ **Web URLs**: `http://localhost:56956/`  
✅ **Mobile URLs**: `myapp://auth` / `myapp://signout`  
✅ **UI overflow fixed**: Login screen is now scrollable  

Ready to test!

