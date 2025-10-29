# Login Audit Fix Summary

## Problem
Profile updates work fine on both web & mobile, but login details (last_login + audit) don't change. The admin audit page shows only old data.

## Root Cause Analysis
The "mark a login" write-path was not firing properly or was writing to a different database than what the read-path was using.

## Changes Made

### 1. Updated SessionService (`SessionService.java`)
Simplified and made the `markLogin` method more robust:
- Removed complex error handling that was hiding issues
- Simplified user resolution logic (check uid claim, fallback to email)
- Direct database operations without extra abstractions
- Better logging for debugging
- Idempotency via token JTI (falls back to SHA256 hash if JTI not present)

### 2. Enabled SQL Logging (`application.yml`)
Added detailed SQL logging to see actual database operations:
```yaml
org.hibernate.SQL: DEBUG
org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

### 3. Database Schema Verification
Created SQL script to verify and fix the database schema:
- `verify_and_fix_schema.sql` - Ensures `token_jti` column exists and has unique index
- `verify-login-audit-schema.ps1` - PowerShell script to run the SQL verification

### 4. Controller Already Has Good Logging
The `SessionController` already has extensive logging that will help debug if the endpoint is being hit.

## How to Use This Fix

### Step 1: Verify Database Schema
Run the PowerShell script to ensure your database has the correct schema:
```powershell
.\verify-login-audit-schema.ps1
```

Or manually run the SQL file in pgAdmin or psql:
```bash
psql -h localhost -U itcenter -d itcenter_auth -f auth-backend/src/main/resources/db/verify_and_fix_schema.sql
```

### Step 2: Rebuild and Restart Backend
```powershell
cd auth-backend
mvn clean package -DskipTests
java -jar target/auth-backend-1.0.0.jar
```

### Step 3: Test the Fix

#### Test from Web:
1. Login to the web app
2. Check the browser network tab - look for a call to `/api/v1/sessions/mark-login`
3. Check backend logs for `[MARK-LOGIN]` entries
4. Verify SQL logs show INSERT into login_audit and UPDATE app_users

#### Test from Mobile:
1. Login to the mobile app
2. Check backend logs for `[MARK-LOGIN]` entries
3. Verify SQL logs show database writes

#### Test with curl:
```bash
# Get a fresh access token from your app
ACCESS_TOKEN="<your-access-token>"

# Test the endpoint directly
curl -i -X POST http://localhost:8080/api/v1/sessions/mark-login \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}"
```

### Step 4: Verify Data in Database
Connect to PostgreSQL and run:
```sql
-- Most recent logins
SELECT id, event_type, user_id, token_jti, created_at
FROM login_audit
ORDER BY id DESC
LIMIT 10;

-- User's last_login field
SELECT id, email, last_login 
FROM app_users
WHERE email IN ('<your-email>');
```

## Expected Log Output
After a successful login, you should see logs like:
```
[MARK-LOGIN] sub=<sub> aud=[...] jti=<jti> exp=... iat=... issuer=...
[MARK-LOGIN] All claims: {...}
[MARK-LOGIN] Service call completed successfully
[MARK-LOGIN] Using idempotency key: <jti>
[MARK-LOGIN] Resolved user: id=1, email=user@example.com
[MARK-LOGIN] Audit entry saved: id=123
[MARK-LOGIN] Updated last_login for user: 1
```

And SQL logs showing:
```sql
Hibernate: insert into login_audit (created_at, event_type, ip_address, metadata, token_jti, user_agent, user_id) values (?, ?, ?, ?, ?, ?, ?)
Hibernate: update app_users set last_login=? where id=?
```

## Troubleshooting

### If [MARK-LOGIN] logs don't appear:
- The endpoint isn't being hit
- Check that web/mobile apps are calling `/api/v1/sessions/mark-login` after login
- Check security config allows authenticated access to this endpoint
- Check network connectivity

### If logs appear but no database writes:
- Check for exceptions in the service layer
- Verify database connection is working
- Check that the transaction is committing
- Verify database schema has token_jti column and unique index

### If writes succeed but old data shows in UI:
- Check that the admin UI is refreshing data
- Verify the admin UI is connected to the correct database
- Check for caching in the admin UI

## Configuration Verification
Check these settings in your environment:
1. `spring.datasource.url` - Should point to your PostgreSQL database
2. `spring.profiles.active` - Should not be test or H2
3. `spring.jpa.hibernate.ddl-auto` - Should be `update` or `validate`
4. `logging.level.com.itcenter` - Should be DEBUG to see detailed logs

## Files Modified
1. `auth-backend/src/main/java/com/itcenter/auth/service/SessionService.java`
2. `auth-backend/src/main/resources/application.yml`
3. Created: `auth-backend/src/main/resources/db/verify_and_fix_schema.sql`
4. Created: `verify-login-audit-schema.ps1`
5. Created: `LOGIN_AUDIT_FIX_SUMMARY.md`

## Next Steps
1. Run the verification script
2. Rebuild and restart the backend
3. Test login from web and mobile
4. Check logs and database
5. Report any issues you encounter

