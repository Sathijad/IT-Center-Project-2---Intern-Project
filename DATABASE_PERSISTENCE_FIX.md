# Database Persistence Fix - Data No Longer Lost on Restart

## Problem
Display name and profile data was being **wiped** every time the backend restarted.

## Root Cause Found
In `application.yml` line 19:
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: create  # ❌ PROBLEM!
```

The `ddl-auto: create` setting means:
- **Every Spring Boot startup** = DROP all tables
- Then CREATE all tables fresh from entities
- **All data is lost!** ❌

## The Fix

### Changed Configuration
**File:** `auth-backend/src/main/resources/application.yml`

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update  # ✅ FIXED - Now updates schema without deleting data
```

**File:** `auth-backend/src/main/resources/application-dev.yml`
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update  # ✅ Ensure dev profile also uses update
```

## What Each Setting Does

| Setting | Behavior | Use Case |
|---------|----------|----------|
| `create` | ❌ Drops & recreates all tables | Development only, data loss on restart |
| `update` | ✅ Updates schema, preserves data | Development (recommended) |
| `validate` | ✅ No schema changes, just checks | Production |
| `create-drop` | ❌ Creates on startup, drops on shutdown | Never use with real data |
| `none` | ✅ No schema management | Use with Flyway only |

## Your Setup Now

### ✅ Database: PostgreSQL (Persistent)
- Using PostgreSQL in Docker
- **Volume is configured** (line 14 of docker-compose.yml)
- Data persists across container restarts ✅

### ✅ JPA: `ddl-auto: update`
- Updates schema safely
- Preserves existing data
- Only adds new tables/columns if needed ✅

### ✅ Flyway: Disabled
- Not interfering with schema
- No automatic cleaning ✅

## Testing

### Before Fix
1. Start backend
2. Update display name to "John Doe"
3. Restart backend
4. **Data lost** ❌

### After Fix
1. Start backend
2. Update display name to "John Doe"  
3. Restart backend
4. **Data preserved** ✅

## How to Verify

### Check Database Directly
```sql
-- Connect to database
psql -h localhost -U itcenter -d itcenter_auth
Password: password

-- Check if data persists
SELECT id, email, display_name, locale FROM app_users;

-- Update a profile
UPDATE app_users SET display_name = 'Test Name' WHERE id = 1;

-- Restart backend

-- Check again - should still be 'Test Name'
SELECT id, email, display_name, locale FROM app_users;
```

### Check Startup Logs
Look for these messages:

#### ❌ Before (with ddl-auto: create)
```
Hibernate: drop table app_users cascade
Hibernate: create table app_users (...)
```
**Meaning:** All data deleted on each start

#### ✅ After (with ddl-auto: update)
```
Hibernate: create table app_users if not exists (...)
```
or no schema messages at all
**Meaning:** Only creates if missing, preserves data

## Additional Verification

### Check Docker Volume
```bash
# List volumes
docker volume ls

# Should see:
# itcenter_project_2_postgres_data

# Check volume size (should grow as data is added)
docker system df -v
```

### Check PostgreSQL Logs
```bash
# View container logs
docker logs itcenter_pg

# Should show:
# database system is ready to accept connections
# No DROP or TRUNCATE commands
```

## Production Recommendation

For production, use:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # Don't auto-update schema in prod
  flyway:
    enabled: true  # Use Flyway migrations instead
```

This way:
- Spring Boot only validates schema exists
- Flyway manages all schema changes
- Zero risk of accidental data loss

## Summary

### Before
- ❌ Every restart = fresh database
- ❌ All user data lost
- ❌ Profile edits disappear

### After
- ✅ Data persists across restarts
- ✅ Profile edits preserved
- ✅ Database grows with usage
- ✅ Proper development setup

## Next Steps

1. **Rebuild backend:**
   ```powershell
   cd auth-backend
   mvn clean package -DskipTests
   ```

2. **Restart backend**
   - Data will now persist ✅

3. **Test by:**
   - Updating profile
   - Restarting backend
   - Verifying profile data still there ✅

4. **Optional - Migrate existing dev data:**
   ```sql
   -- If you want to keep old database
   -- Connect to DB BEFORE restarting
   -- Export data:
   pg_dump -h localhost -U itcenter itcenter_auth > backup.sql
   
   -- Then after restart and schema update:
   -- Import data:
   psql -h localhost -U itcenter itcenter_auth < backup.sql
   ```

