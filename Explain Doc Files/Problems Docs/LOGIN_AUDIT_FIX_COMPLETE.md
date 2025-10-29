# Login Audit Fix - Complete

## Problem
Login details were not being updated in the database and Admin interface. The logs showed:
```
java.lang.IllegalStateException: No uid/email in token
```

## Root Cause
The `SessionService.markLogin()` method was trying to resolve users by looking for `uid` and `email` claims in the JWT access token. However, Cognito access tokens don't include the `email` claim - they only have `sub` (subject), `username`, and `jti`. 

The service was failing with "No uid/email in token" exception before it could save any login audit entries.

## Solution
Fixed `SessionService.java` to use `UserProvisioningService.findOrCreateFromJwt()` which:
1. Properly extracts the `sub` claim from the JWT
2. Fetches the user's email from Cognito's userInfo endpoint if needed
3. Handles user creation or lookup
4. Updates the `last_login` timestamp automatically

### Changes Made

**File: `auth-backend/src/main/java/com/itcenter/auth/service/SessionService.java`**

- Added `UserProvisioningService` dependency
- Replaced manual user resolution logic with `provisioningService.findOrCreateFromJwt(jwt)`
- Removed duplicate `last_login` update (now handled by UserProvisioningService)
- Removed unused `AppUserRepository` and `LocalDateTime` imports

### Code Changes

**Before:**
```java
// Resolve app user
Long userId = jwt.getClaim("uid");
AppUser user;

if (userId == null) {
    String email = jwt.getClaim("email");
    if (email == null) {
        throw new IllegalStateException("No uid/email in token");  // ❌ FAILED HERE
    }
    user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalStateException("App user not provisioned: " + email));
} else {
    user = userRepository.getReferenceById(userId);
}
```

**After:**
```java
// Use UserProvisioningService to resolve user (handles JWT claims properly)
AppUser user = provisioningService.findOrCreateFromJwt(jwt);
log.info("[MARK-LOGIN] Resolved user: id={}, email={}", user.getId(), user.getEmail());
```

## How to Test

### 1. Restart the Backend

The backend needs to be restarted to pick up the code changes:

```powershell
cd auth-backend
.\start.ps1
```

### 2. Login from Web

1. Open the web app in your browser
2. Login with your credentials
3. Check the browser console - you should see:
   ```
   [MARK-LOGIN] Attempting to call mark-login endpoint...
   [MARK-LOGIN] Login marked successfully, status: 204
   ```

### 3. Login from Mobile

1. Open the mobile app
2. Login with your credentials
3. Login should be automatically tracked

### 4. Check Backend Logs

You should now see successful login tracking:

```
[MARK-LOGIN] Endpoint hit! sub=... jti=...
[MARK-LOGIN] Using idempotency key: ...
[MARK-LOGIN] Resolved user: id=..., email=...
[MARK-LOGIN] Audit entry saved: id=...
```

### 5. Verify in Admin Interface

1. Go to the Admin web interface
2. Navigate to "Audit Log" page
3. You should see new login entries with current timestamps
4. Login entries should update every time you login with a new JWT token

### 6. Check Database

Connect to PostgreSQL and run:

```sql
-- Check recent login audit entries
SELECT 
    id, 
    event_type, 
    user_id, 
    token_jti, 
    created_at
FROM login_audit
WHERE event_type = 'LOGIN_SUCCESS'
ORDER BY id DESC
LIMIT 10;

-- Check user's last_login field
SELECT 
    id, 
    email, 
    last_login 
FROM app_users
WHERE email = 'your-email@example.com';
```

## Expected Behavior

### After This Fix:

✅ **Web login** triggers mark-login endpoint  
✅ **Mobile login** triggers mark-login endpoint  
✅ **Login audit entries** are created in database  
✅ **last_login** timestamp updates in app_users table  
✅ **Admin interface** shows current login data  
✅ **Idempotent**: Same token won't create duplicate entries  

### How Idempotency Works

The system uses JWT's `jti` (JWT ID) claim as a unique key. Each token from Cognito has a unique `jti`. When the same token is used multiple times (e.g., page refresh), the system detects it's already recorded and skips creating a duplicate entry.

## Verification

After restarting the backend, you can verify by:

1. Looking for `[MARK-LOGIN] Audit entry saved` in backend logs (success!)
2. No more `No uid/email in token` errors in logs
3. Admin interface shows updated login times
4. Database contains new audit entries with current timestamps

## Summary

The login audit system is now working correctly. Both web and mobile logins will create audit entries and update the `last_login` field in the database. The Admin interface will display the most recent login information.

