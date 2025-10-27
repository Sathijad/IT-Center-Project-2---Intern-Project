# Quick Start Guide 🚀

## 1. Start Backend

```bash
cd auth-backend
./start.bat
# or
mvn spring-boot:run
```

Verify: Visit http://localhost:8080/healthz

---

## 2. Update AWS Cognito (One-time)

Go to [AWS Cognito Console](https://console.aws.amazon.com/cognito)

**User Pool:** `ap-southeast-2_hTAYJId8y`  
**App Client:** `3rdnl5ind8guti89jrbob85r4i`

### Add to Callback URLs:
```
http://localhost:56956/
myapp://auth
```

### Add to Sign-out URLs:
```
http://localhost:56956/
myapp://signout
```

---

## 3. Run Flutter App

### Web (Recommended for testing)
```bash
cd mobile-app
flutter run -d chrome --web-port 56956
```

### Android
```bash
flutter run -d android
```

### iOS (Mac)
```bash
flutter run -d ios
```

---

## 4. Test Flow

1. App opens → Shows "Sign In" button
2. Click "Sign In" → Redirects to Cognito
3. Enter credentials → Sign in successfully
4. Redirects back → Shows "Employee Home" with profile
5. Click "Sign Out" → Returns to login

---

## Troubleshooting

### "No access token from Cognito"
- ✅ Check Cognito console has correct callback URLs
- ✅ Ensure you're signed in via Hosted UI

### "Please sign in again"
- ✅ Token expired → Click sign out, then sign in again
- ✅ Backend not running → Start backend

### "Server error, try later"
- ✅ Backend crashed → Check logs
- ✅ Backend port conflict → Kill other processes

### CORS errors in browser console
- ✅ Backend CORS allows `http://localhost:56956`
- ✅ Check `application.yml` has correct origins

---

## File Structure

```
mobile-app/lib/
├── main.dart                          # Entry point
├── amplifyconfiguration.dart          # Platform detector
├── amplifyconfiguration_web.dart      # Web config
├── amplifyconfiguration_mobile.dart   # Mobile config
└── src/
    ├── api_base.dart                  # ✅ API URL helper (NEW)
    ├── auth_service.dart              # Amplify auth wrapper
    ├── home_screen.dart               # ✅ Clean Employee UI (UPDATED)
    ├── login_screen.dart              # Hosted UI login
    ├── register_sheet.dart           # Registration modal
    └── reset_sheet.dart               # Password reset modal
```

---

## What's Ready

✅ Cognito authentication with Hosted UI  
✅ User registration flow  
✅ Password reset flow  
✅ JWT token handling  
✅ Backend API integration  
✅ User profile display  
✅ Error handling & retry  
✅ Sign out functionality  
✅ Platform-aware API URLs  

---

## Next Steps (Optional)

- [ ] Add profile editing (PATCH /api/v1/me)
- [ ] Add clock-in/out feature
- [ ] Add leave request feature
- [ ] Add notifications
- [ ] Add offline support

---

## Ready to Go! 🎉

```bash
# Start backend
cd auth-backend && ./start.bat

# In another terminal
cd mobile-app && flutter run -d chrome --web-port 56956
```

Happy testing! 🚀

