# How User Creation Works with Cognito

## The Flow

### 1. **User Login Process**

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Your Browser  │  ────>  │  AWS Cognito     │  ────>  │   Your Database │
│  (admin-web)    │         │  (user@test.com) │         │   (PostgreSQL)  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
      Step 1                      Step 2                        Step 3
   Redirect to              User authenticates          User record created
   Cognito                  (email + password)           on first API call
```

### 2. **Detailed Steps**

**Step 1: Click "Sign In"**
- Frontend redirects you to AWS Cognito login page
- You enter your email (`user@test.com`) and password
- Cognito validates your credentials

**Step 2: Get Tokens**
- Cognito redirects you back to your app with authorization code
- Your app exchanges the code for JWT tokens (ID token, Access token)
- Tokens are stored in browser localStorage

**Step 3: Call Backend API**
```typescript
// From Callback.tsx after getting tokens
const userResponse = await api.get('/api/v1/me');
```
This is where the magic happens!

### 3. **Backend User Provisioning (JIT - Just In Time)**

When the backend receives the API call with JWT token:

```java
// UserService.getCurrentUserProfile()
Jwt jwt = (Jwt) auth.getPrincipal();  // Extract JWT from request
AppUser user = provisioningService.findOrCreateFromJwt(jwt);
```

**What happens:**
1. Backend extracts user info from JWT token (email, sub, name, etc.)
2. Checks if user exists in database by `cognito_sub`
3. If **NOT found** → Creates new user record with:
   - `cognito_sub` (unique Cognito user ID)
   - `email` (from Cognito)
   - `display_name` (from Cognito name or email)
   - Default `EMPLOYEE` role
4. If **found** → Returns existing user

## Why Your User Might Not Be in Database

### Possible Reasons:

1. **You haven't successfully completed the login flow yet**
   - Check if you were redirected back to the app after Cognito login
   - Check if tokens are stored in localStorage

2. **Backend call failed**
   - Network error calling `GET /api/v1/me`
   - Backend authentication error
   - Backend not running (port 8080)

3. **JWT token issues**
   - Invalid token
   - Token expired
   - Token signature verification failed

4. **Database connection issues**
   - Backend can't connect to PostgreSQL
   - User creation failed silently

## How to Debug

### Check 1: Is User in Database?
```sql
SELECT * FROM app_users WHERE email = 'user@test.com';
```

### Check 2: Are Tokens in Browser?
Open browser developer tools → Console:
```javascript
// Run in browser console
localStorage.getItem('id_token')
localStorage.getItem('access_token')
```

### Check 3: Check Backend Logs
```powershell
# View backend logs
Get-Content auth-backend/logs/auth-api.log -Tail 50
```

Look for:
- `Creating new user via JIT provisioning for sub: ...`
- `Created user with ID: ... for email: ...`

### Check 4: Test Backend API Directly
```powershell
# Get your access token from browser console first
$token = "YOUR_ACCESS_TOKEN"

# Test the API
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/me" `
  -Headers @{Authorization="Bearer $token"} `
  -Method GET
```

## Expected Database Record

After successful login, you should see:

```sql
SELECT * FROM app_users WHERE email = 'user@test.com';
```

```
id | cognito_sub                    | email           | display_name | ... 
---+--------------------------------+-----------------+--------------+-----
1  | abc-123-def-456                | user@test.com   | User Name    | ...
```

## Summary

**The user record is created automatically when:**
1. ✅ You successfully login through Cognito
2. ✅ Your app gets JWT tokens
3. ✅ Your app calls the backend API with the token
4. ✅ Backend validates the token and creates the user (first time only)

**The user record will NOT be created if:**
- ❌ Login flow didn't complete
- ❌ Backend API wasn't called
- ❌ Backend authentication failed
- ❌ Database connection failed

## Next Steps

1. Check if you completed the full login flow
2. Check browser localStorage for tokens
3. Check backend logs for errors
4. Try logging in again and monitor the logs

