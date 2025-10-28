# Diagnostic Testing Guide 🔍

## What Changed

The HomeScreen now has **diagnostic mode** enabled. It will show:

1. **Access Token** (first 30 chars)
2. **Decoded JWT Claims** (issuer, sub, email, groups/roles)
3. **API Response** (status code + body)
4. **Any Errors** (network/auth failures)

---

## How to Test

### Step 1: Start Backend on Port 8080

```bash
cd auth-backend
mvn spring-boot:run
```

Verify it's running:
```bash
Invoke-WebRequest http://localhost:8080/healthz
# Should return: OK
```

### Step 2: Run Flutter Web

```bash
cd mobile-app
flutter run -d chrome --web-port 56956
```

### Step 3: Sign In

1. Click **"Sign In"** button
2. Complete Cognito Hosted UI login
3. After redirect, you'll see the **Diagnostic Screen**

---

## What to Look For

### ✅ Success Indicators

**Access Token:**
```
eyJraWQiOiJcL3d3dy5hd3MuYW1hem9...
```

**Decoded Claims:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "cognito:groups": ["EMPLOYEE"],
  "iss": "https://cognito-idp.ap-southeast-2.amazonaws.com/..."
}
```

**API Result:**
```
Status: 200
{
  "id": "xxx",
  "email": "user@example.com",
  ...
}
```

---

### ❌ Common Errors & Fixes

#### "No access token from Cognito"
**Issue:** Amplify session not established  
**Fix:** 
- Ensure you're using `kIsWeb` to select web config
- Check Cognito console has `http://localhost:56956/` in callbacks

#### Status: 401 Unauthorized
**Issue:** Backend rejected token  
**Checks:**
- Verify `application.yml` issuer URI matches your pool
- Check JWT claims for `aud` (audience) mismatch
- Ensure `/api/v1/me` doesn't require EMPLOYEE role

#### Status: 0 or Network Error
**Issue:** CORS or wrong URL  
**Checks:**
- Backend CORS allows `http://localhost:56956`
- Backend is running on port 8080
- Network tab shows OPTIONS preflight

#### Claims Missing Email/Roles
**Issue:** Cognito not returning claims  
**Fix:**
- Check User Pool attribute permissions
- Ensure user has verified email
- Check user is assigned to a group/role

---

## Interpreting Results

### Token Structure
```
header.payload.signature
```

The diagnostic decodes the **payload** to show:
- `sub` - User ID
- `email` - User email
- `cognito:groups` - User roles
- `iss` - Token issuer
- `aud` - Audience (should match client ID)

### API Status Codes

| Status | Meaning | Next Action |
|--------|---------|-------------|
| 200 | ✅ Success | View JSON body |
| 401 | Token rejected | Check backend JWT config |
| 403 | Forbidden | Check role requirements |
| 404 | Endpoint not found | Verify `/api/v1/me` exists |
| 0 | Network error | Check backend is running |

---

## After Testing

Once you see **Status 200** with user data, swap back to the normal UI:

Replace `HomeScreen` with your production version.

---

## Quick Troubleshooting

### Backend Not Responding
```bash
# Check if backend is running
netstat -ano | findstr :8080

# Kill any stuck processes
taskkill /PID <PID> /F

# Restart backend
cd auth-backend
mvn spring-boot:run
```

### Flutter Web Port Conflict
```bash
# Kill process on port 56956
netstat -ano | findstr :56956
taskkill /PID <PID> /F

# Run with different port
flutter run -d chrome --web-port 56956
```

### CORS Issues
Add to `auth-backend/src/main/resources/application.yml`:
```yaml
cors-allowed-origins: http://localhost:56956,http://localhost:5173,http://localhost:8080
```

---

## Expected Output

When everything works, you'll see:

```
Access Token (start): eyJraWQiOiJcL3d3dy5hd3MuYW1hem9...

Decoded Claims:
{
  "sub": "abc123-456-789",
  "email": "user@itcenter.com",
  "cognito:groups": ["EMPLOYEE"],
  "token_use": "access",
  "scope": "aws.cognito.signin.user.admin openid email profile",
  "iss": "https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y"
}

/api/v1/me result:
Status: 200
{
  "id": "uuid",
  "email": "user@itcenter.com",
  "displayName": "John Doe",
  "roles": ["EMPLOYEE"]
}
```

---

## Ready to Test! 🚀

Run the commands above and check the diagnostic output!

