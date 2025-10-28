# Mobile Login Audit Debugging Guide

## Problem
Mobile profile updates work but login audit events are not appearing in the database.

## Added Logging

### Backend Logs (Spring Boot)

The system now has extensive logging at key points:

**SessionController Peripheralization**:
```
[MARK-LOGIN] Endpoint hit! sub=... aud=... jti=... exp=... iat=... issuer=...
[MARK-LOGIN] All claims: {...}
[MARK-LOGIN] Service call completed successfully
```

**SessionService**:
```
[MARK-LOGIN] Checking if JTI already exists: <jti-value>
[MARK-LOGIN] JTI exists check result: true/false
[MARK-LOGIN] Finding or creating user from JWT
[MARK-LOGIN] User found/created: user@example.com
[MARK-LOGIN] Saving audit entry to database
[MARK-LOGIN] Audit entry saved successfully
[MARK-LOGIN] Updated last_login timestamp
[MARK-LOGIN] COMPLETE: Login marked for user: user@example.com, JTI: ...
```

### Mobile App Logs (Flutter)

**ApiClient**:
```
[MARK-LOGIN] Method called from mobile app
[MARK-LOGIN] Access token length: 1234
[MARK-LOGIN] URL: http://10.0.2.2:8080/api/v1/sessions/mark-login
[MARK-LOGIN] Authorization header: Bearer eyJhbGciOiJSUzI1NiIs...
[MARK-LOGIN] Response status: 204
[MARK-LOGIN] Response body: 
[MARK-LOGIN] SUCCESS: Login marked successfully
```

## Step-by-Step Debugging

### Step 1: Verify Mobile App is Calling the Endpoint

**Look for in mobile logs:**
```
[MARK-LOGIN] Method called from mobile app
[MARK-LOGIN] URL: http://...
```

**If NOT present:**
- The auth flow isn't triggering `markLoginOnce()`
- Check that `main.dart` properly detects sign-in
- Verify `_hasMarkedLogin` flag logic

**If present but token is null:**
```
[MARK-LOGIN] ERROR: No access token available
```
- Amplify session isn't returning access token
- Check Amplify configuration
- Verify user completed sign-in successfully

### Step 2: Verify Request Reaches Backend

**Look for in backend logs:**
```
[MARK-LOGIN] Endpoint hit! sub=... aud=... jti=...
```

**If NOT present:**
- Request isn't reaching the backend
- Check base URL (Android emulator needs `10.0.2.2`, not `localhost`)
- Network connectivity issue
- Firewall blocking connection

**If present with 403:**
```
[MARK-LOGIN] Authentication is not JwtAuthenticationToken
```
- Wrong authentication type (should be JWT)
- Token validation failed
- Security configuration issue

### Step 3: Check Token Validity

**Look for in backend logs:**
```
[MARK-LOGIN] All claims: {...}
```

**Check for:**
- `sub` (subject): Should be Cognito user ID
- `aud` (audience): Should match your client ID
- `exp` (expressive): Should be future timestamp
- `iss` (issuer): Should be your Cognito User Pool ARN

**If missing `jti`:**
```
No JTI claim found, using SHA256 hash of token: ...
```
- This is OK - system will hash the token
- Idempotency still works

### Step 4: Verify User Resolution

**Look for in backend logs:**
```
[MARK-LOGIN] Finding or creating user from JWT
[MARK-LOGIN] User found/created: user@example.com
```

**If returns NULL:**
```
[MARK-LOGIN] User found/created: NULL
[MARK-LOGIN] ERROR: Could not find or create user from JWT
```
- User provisioning failed
- Database connection issue
- JWT claims don't match user records

**Check database:**
```sql
SELECT * FROM app_users WHERE email = 'user@example.com';
```

### Step 5: Verify Database Insert

**Look for in backend logs:**
```
[MARK-LOGIN] Saving audit entry to database
[MARK-LOGIN] Audit entry saved successfully
[MARK-LOGIN] COMPLETE: Login marked for user: ...
```

**If you see errors:**
```
[MARK-LOGIN] ERROR: Failed to record login for user: ... - <exception>
```
- Database constraint violation
- Missing columns (token_jti migration not applied?)
- Transaction rollback

**Verify in database:**
```sql
SELECT * FROM login_audit 
WHERE event_type = 'LOGIN_SUCCESS' 
ORDER BY created_at DESC 
LIMIT 10;

SELECT * FROM app_users 
WHERE email = 'user@example.com';
-- Check: last_login should be updated
```

### Step 6: Check for Duplicate Skipping

**Look for in backend logs:**
```
[MARK-LOGIN] JTI exists check result: true
[MARK-LOGIN] Token JTI already recorded: ..., skipping
```

**If true:**
- Idempotency working correctly
- Previous call already recorded this token
- This is expected behavior on page refresh

**To force new entry:**
- Sign out and sign in again (creates new JWT)

### Step 7: Verify Admin Audit Page

**Check endpoint:**
```bash
curl http://localhost:8080/api/v1/admin/audit-log \
  -H "Authorization: Bearer <admin-token>"
```

**Should return:**
```json
{
  "content": [
    {
      "eventType": "LOGIN_SUCCESS",
      "userEmail": "user@example.com",
      "createdAt": "2024-..."
    }
  ]
}
```

**If empty:**
- Check query isn't filtering out `LOGIN_SUCCESS`
- Verify user has ADMIN role
- Check pagination (default is 20 items)

## Common Issues & Solutions

### Issue 1: "No access token available"

**Symptom:**
```
[MARK-LOGIN] ERROR: No access token available
```

**Cause:** Amplify session not returning tokens

**Solution:**
1. Check Amplify initialization completed
2. Verify sign-in completed successfully
3. Check `amplifyconfiguration.dart` is correct
4. Try calling `getAccessToken()` directly in debug

### Issue 2: Connection Refused

**Symptom:**
```
[MARK-LOGIN] ERROR: Failed to mark login: SocketException: Connection refused
```

**Cause:** Wrong base URL for platform

**Solution:**
- **Android emulator**: Use `http://10.0.2.2:8080`
- **iOS simulator**: Use `http://localhost:8080`
- **Physical device**: Use your PC's LAN IP
- Check `api_base.dart` platform detection

### Issue 3: 401 Unauthorized

**Symptom:**
```
[MARK-LOGIN] Response status: 401
```

**Cause:** Token invalid or expired

**Solution:**
1. Check token expiration (`exp` claim)
2. Verify device clock is correct
3. Try getting new token (sign out/in)
4. Check if token is ID token instead of access token

### Issue 4: Database Constraint Violation

**Symptom:**
```
[MARK-LOGIN] ERROR: Failed to record login ... - ConstraintViolationException
```

**Cause:** Missing migrations or duplicate JTI

**Solution:**
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'login_audit' AND column_name = 'token_jti';

-- If missing, run migration
-- V6__add_token_jti_to_login_audit.sql
```

### Issue 5: User Not Found

**Symptom:**
```
[MARK-LOGIN] User found/created: NULL
```

**Cause:** User provisioning failing

**Solution:**
1. Check `app_users` table for the email
2. Verify JWT `sub` claim matches `cognito_sub`
3. Check `UserProvisioningService` logs
4. Verify database connection

### Issue 6: Silent Failure

**Symptom:** No logs at all

**Cause:** Log level too high or logging not configured

**Solution:**
1. Check `application-dev.yml` has debug logging enabled
2. Verify console output is enabled
3. Check Android logcat / iOS console
4. Add explicit print statements

## Testing with curl

Test the endpoint directly with curl using a mobile access token:

```bash
# Get access token from mobile logs (look for "Access token length: ...")
ACCESS_TOKEN="<paste-token-here>"

# Call the endpoint
curl -v -X POST "http://localhost:8080/api/v1/sessions/mark-login" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}"

# Expected: 204 No Content
```

**Check backend logs** for `[MARK-LOGIN]` entries

**Check database:**
```sql
SELECT * FROM login_audit ORDER BY created_at DESC LIMIT 5;
```

## Summary Checklist

✅ Mobile app calls mark-login after sign-in
✅ Access token is available and sent
✅ Request reaches backend
✅ Token validated successfully
✅ User found/created in database
✅ Audit entry saved to database
✅ Admin audit page shows entry

If any step fails ~check the corresponding logs and apply the fix.

