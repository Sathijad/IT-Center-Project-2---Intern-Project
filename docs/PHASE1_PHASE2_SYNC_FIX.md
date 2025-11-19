# Phase 1 & Phase 2 User Sync Fix

## Problem

When a new user logs in:
- ❌ User is NOT created in Phase 1 (`app_users` table)
- ✅ User IS created in Phase 2 (`users` table) 
- Result: Data inconsistency - user exists in Phase 2 but not in Phase 1

## Root Cause

Phase 2 backend was creating users independently without checking Phase 1 first. Phase 1 should be the **source of truth**.

## Solution

Phase 2 now checks Phase 1 database FIRST before creating users:

1. **User logs into web app** → Creates user in Phase 1 (`app_users` table)
2. **User calls Phase 2 API** → Phase 2 checks Phase 1 first
3. **If user exists in Phase 1** → Sync data from Phase 1 to Phase 2
4. **If user doesn't exist in Phase 1** → Log warning (user should login to web app first)

## Configuration

### Phase 2 Backend Environment Variables

Add these to your Phase 2 backend (AWS Lambda/serverless):

```bash
# Phase 1 database connection (pgAdmin)
PHASE1_DATASOURCE_URL=jdbc:postgresql://localhost:5432/itcenter_auth
PHASE1_DATASOURCE_USERNAME=itcenter
PHASE1_DATASOURCE_PASSWORD=password
```

For production (if Phase 1 is on a server):
```bash
PHASE1_DATASOURCE_URL=jdbc:postgresql://your-phase1-host:5432/itcenter_auth
PHASE1_DATASOURCE_USERNAME=your_username
PHASE1_DATASOURCE_PASSWORD=your_password
```

### How It Works

```
┌─────────────────┐
│  New User       │
│  Logs In        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Web App                        │
│  Calls /api/v1/me               │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Phase 1 Backend               │
│  Creates user in app_users     │
│  (Source of Truth)             │
└────────┬────────────────────────┘
         │
         │ User calls Phase 2 API
         ▼
┌─────────────────────────────────┐
│  Phase 2 Backend               │
│  1. Checks Phase 1 database     │
│  2. If found → Sync to Phase 2  │
│  3. If not found → Log warning  │
└─────────────────────────────────┘
```

## Flow Details

### Step 1: User Login to Web App
- User authenticates with Cognito
- Web app calls `/api/v1/me` to Phase 1 backend
- Phase 1 backend creates user in `app_users` table
- ✅ User now exists in Phase 1

### Step 2: User Calls Phase 2 API
- User makes request to Phase 2 (leave/attendance)
- Phase 2 `authenticateRequest()` is called
- Phase 2 checks Phase 1 database first
- If user exists in Phase 1:
  - ✅ Use Phase 1 data (email, display_name) as source of truth
  - ✅ Create/update user in Phase 2 `users` table
- If user doesn't exist in Phase 1:
  - ⚠️ Log warning
  - ⚠️ Still create in Phase 2 (to prevent errors)
  - ⚠️ Admin should investigate why user wasn't in Phase 1

## Important Points

1. **Phase 1 is Source of Truth**: Email and display_name come from Phase 1
2. **Phase 2 Checks First**: Before creating, Phase 2 verifies user exists in Phase 1
3. **Warnings Logged**: If user not in Phase 1, warnings are logged for investigation
4. **Non-Blocking**: System continues to work even if Phase 1 check fails

## Verification

### Check Logs

After deploying, check Phase 2 logs for:

✅ **Success**:
```
User found in Phase 1, syncing to Phase 2
cognitoSub: xxx, phase1Id: 123, phase1Email: user@example.com
```

⚠️ **Warning** (user not in Phase 1):
```
User not found in Phase 1 database. User should be created in Phase 1 first via web app login.
Created user in Phase 2 without Phase 1 record. This should be investigated.
```

### Verify Data

1. **Check Phase 1**:
   ```sql
   SELECT id, cognito_sub, email, display_name 
   FROM app_users 
   WHERE cognito_sub = 'your-cognito-sub';
   ```

2. **Check Phase 2**:
   ```sql
   SELECT user_id, cognito_sub, email, display_name 
   FROM users 
   WHERE cognito_sub = 'your-cognito-sub';
   ```

3. **Compare**: Email and display_name should match (from Phase 1)

## Troubleshooting

### User Not Created in Phase 1

**Problem**: User exists in Phase 2 but not Phase 1

**Solution**:
1. User must login to web app first (calls `/api/v1/me`)
2. Check Phase 1 backend is running
3. Check Phase 1 database connection
4. Check Phase 1 logs for errors

### Phase 2 Can't Connect to Phase 1

**Problem**: Phase 2 logs show "Phase 1 database not configured"

**Solution**:
1. Set environment variables:
   - `PHASE1_DATASOURCE_URL`
   - `PHASE1_DATASOURCE_USERNAME`
   - `PHASE1_DATASOURCE_PASSWORD`
2. Restart Phase 2 backend
3. Check network connectivity between Phase 2 and Phase 1 database

### Data Mismatch

**Problem**: Email/display_name different between Phase 1 and Phase 2

**Solution**:
- Phase 2 now uses Phase 1 data as source of truth
- If mismatch exists, Phase 2 will update on next API call
- Or manually sync using SQL

## Migration for Existing Users

If you have users in Phase 2 but not Phase 1:

1. **Option 1**: Have users login to web app (creates in Phase 1)
2. **Option 2**: Manually create in Phase 1:
   ```sql
   -- In Phase 1 database
   INSERT INTO app_users (cognito_sub, email, display_name, is_active, locale)
   SELECT cognito_sub, email, display_name, true, 'en'
   FROM users  -- This assumes you can query Phase 2 from Phase 1
   WHERE cognito_sub NOT IN (SELECT cognito_sub FROM app_users);
   ```

## Summary

- ✅ Phase 1 is now the source of truth
- ✅ Phase 2 checks Phase 1 before creating users
- ✅ Data is synced from Phase 1 to Phase 2
- ✅ Warnings logged if user not in Phase 1
- ✅ System continues to work even with issues

