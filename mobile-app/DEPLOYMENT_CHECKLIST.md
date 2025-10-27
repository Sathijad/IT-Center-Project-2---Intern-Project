# Deployment Checklist ✅

## Unified Backend Port: 8080

Everything now uses port **8080** for consistency.

---

## 1. Backend Configuration

**File:** `auth-backend/src/main/resources/application.yml`

```yaml
server:
  port: ${BACKEND_PORT:8080}  # ✅ Single port

app:
  cors-allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://127.0.0.1:5173,http://localhost:56956,http://localhost:8080}
```

**What Changed:**
- ✅ Backend runs on port 8080
- ✅ CORS allows Flutter web (56956) and React admin (5173)

---

## 2. Flutter Mobile App Configuration

### Web Configuration (`amplifyconfiguration_web.dart`)
```json
{
  "SignInRedirectURI": "http://localhost:56956/",
  "SignOutRedirectURI": "http://localhost:56956/"
}
```

### Mobile Configuration (`amplifyconfiguration_mobile.dart`)
```json
{
  "SignInRedirectURI": "myapp://auth",
  "SignOutRedirectURI": "myapp://signout"
}
```

### API Calls (`home_screen.dart`)
```dart
Uri.parse('http://localhost:8080/api/v1/me')  // ✅ Web & iOS
// For Android emulator: use http://10.0.2.2:8080
```

---

## 3. AWS Cognito Console Setup

Update App Client: `3rdnl5ind8guti89jrbob85r4i`

### Allowed Callback URLs:
```
myapp://auth
http://localhost:56956/
http://localhost:5173/auth/callback
```

### Allowed Sign-out URLs:
```
myapp://signout
http://localhost:56956/
http://localhost:5173
```

---

## 4. How to Start Everything

### Terminal 1: Start Backend
```bash
cd auth-backend
./start.bat
# or
mvn spring-boot:run
```

Verify backend:
```bash
Invoke-WebRequest http://localhost:8080/healthz
```

### Terminal 2: Start React Admin (if using)
```bash
cd admin-web
npm run dev
```

### Terminal 3: Start Flutter Web
```bash
cd mobile-app
flutter run -d chrome --web-port 56956
```

---

## 5. Testing Flow

1. **Start backend** on port 8080 ✅
2. **Run Flutter web** on port 56956 ✅
3. **Click "Sign In"** → Redirects to Cognito ✅
4. **After sign-in** → Redirects back to app ✅
5. **Calls `/api/v1/me`** on http://localhost:8080 ✅

---

## Port Summary

| Service | Port | URL |
|---------|------|-----|
| Backend API | 8080 | http://localhost:8080 |
| React Admin | 5173 | http://localhost:5173 |
| Flutter Web | 56956 | http://localhost:56956 |
| Android Emulator | - | Use http://10.0.2.2:8080 |

---

## 6. Common Issues Fixed

✅ **No Identity Pool blocks** - Removed from Amplify config  
✅ **Single backend port** - 8080 for everything  
✅ **CORS configured** - Allows all frontend origins  
✅ **Fixed Flutter web port** - 56956 for consistency  
✅ **Clean URLs** - No spaces or malformed URIs  

---

## 7. Testing Checklist

- [ ] Backend running on port 8080
- [ ] `/healthz` returns OK
- [ ] Cognito console updated with callback URLs
- [ ] Flutter web runs on port 56956
- [ ] Sign-in redirects work
- [ ] API calls succeed
- [ ] No CORS errors
- [ ] No Identity Pool 400 errors

---

## Ready to Deploy!

All configurations are unified and ready for testing. 🚀

