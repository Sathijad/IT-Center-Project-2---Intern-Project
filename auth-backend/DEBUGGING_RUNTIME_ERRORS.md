# Debugging Runtime 500 Errors

## Overview

The auth backend starts successfully, but you're seeing 500 errors when making requests to endpoints like `/api/v1/me`. This guide helps you capture and debug these runtime errors.

## Changes Made

### 1. Enhanced Error Logging
- Added detailed logging in `UserService.getCurrentUserProfile()`
- Added null checks and error handling in `mapToProfileResponse()`
- Enhanced `GlobalExceptionHandler` to log full stack traces

### 2. Monitoring Tools
- Created `monitor-errors.ps1` - Real-time log monitoring script
- Created `test-endpoint.ps1` - Endpoint testing guide

## How to Capture Runtime Errors

### Step 1: Start the Auth Backend
```powershell
cd auth-backend
.\start.ps1
```

Wait for the "Started AuthApplication" message.

### Step 2: Monitor Logs in Real-Time

**Option A: Use the monitoring script (Recommended)**
```powershell
# In a NEW terminal window
cd auth-backend
.\monitor-errors.ps1
```

**Option B: Manual log tailing**
```powershell
# In a NEW terminal window
cd auth-backend
Get-Content logs\auth-api.log -Wait -Tail 50
```

### Step 3: Trigger the Error

1. Open your frontend application
2. Navigate to the page that calls `/api/v1/me` (usually the profile page)
3. Or refresh the page if it's already open

### Step 4: Capture the Error

Watch the monitoring terminal. You should see:
- `ERROR` messages in red
- `Runtime error:` followed by the error message
- `Stack trace:` with the full exception details

**Copy the entire error block**, including:
- The error message
- The stack trace
- Any related DEBUG/INFO messages

## What to Look For

Common error patterns:

1. **Database Connection Issues**
   ```
   ERROR: Connection timed out
   ERROR: Unable to obtain connection from database
   ```

2. **User Not Found**
   ```
   ERROR: User not found in database
   WARN: User not found in app_users table
   ```

3. **Null Pointer Exceptions**
   ```
   ERROR: NullPointerException
   Stack trace showing which field is null
   ```

4. **JWT/Authentication Issues**
   ```
   ERROR: Invalid authentication principal
   ERROR: Token missing subject
   ```

5. **Role Loading Issues**
   ```
   ERROR: Failed to map user to profile response
   ERROR: roles is null
   ```

## Example Error Output

When you see an error, it should look like this:

```
2025-11-21 10:30:45 [http-nio-8080-exec-1] ERROR c.i.a.s.UserService - Error in getCurrentUserProfile
java.lang.NullPointerException: roles is null
    at com.itcenter.auth.service.UserService.mapToProfileResponse(UserService.java:245)
    at com.itcenter.auth.service.UserService.getCurrentUserProfile(UserService.java:45)
    ...
```

## Next Steps After Capturing Error

1. **Copy the full error message and stack trace**
2. **Note the timestamp** when the error occurred
3. **Check if the user exists in the database:**
   ```sql
   SELECT id, cognito_sub, email, display_name, is_active 
   FROM app_users 
   WHERE email = 'your-email@example.com';
   ```

4. **Check if the user has roles:**
   ```sql
   SELECT u.id, u.email, r.name as role_name
   FROM app_users u
   LEFT JOIN user_roles ur ON u.id = ur.user_id
   LEFT JOIN roles r ON ur.role_id = r.id
   WHERE u.email = 'your-email@example.com';
   ```

## Quick Test

To quickly test if the endpoint works:

```powershell
# Get your JWT token from browser DevTools (Application > Local Storage > access_token)
$token = "YOUR_JWT_TOKEN"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/me" -Headers $headers -Method Get
    Write-Host "Success!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}
```

## Troubleshooting

### If logs don't show errors:
1. Check that the log file exists: `logs\auth-api.log`
2. Verify logging level is set to DEBUG in `application.yml`
3. Make sure the backend is actually receiving requests (check network tab in browser)

### If you see "User not found":
1. Log out and log back in through the auth backend
2. This will trigger JIT provisioning to create the user in `app_users`
3. Or manually insert the user into the database

### If you see database connection errors:
1. Verify RDS security group allows your IP
2. Check that `config/shared-db.ps1` is loaded correctly
3. Test connectivity: `Test-NetConnection -ComputerName itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com -Port 5432`

