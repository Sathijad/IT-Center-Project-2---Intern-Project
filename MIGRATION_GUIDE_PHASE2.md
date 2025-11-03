# Phase 2 Database Migration Guide

This guide explains how to run the Phase 2 database migrations for Leave & Attendance Management.

## Migration Files

The Phase 2 migrations are:
- `V8__leave_attendance.sql` - Creates all Phase 2 tables (leave_policies, leave_requests, leave_balances, attendance_logs, leave_audit)
- `V9__seed_leave_policies.sql` - Seeds default leave policies (ANNUAL, CASUAL, SICK)

Location: `auth-backend/src/main/resources/db/migration/`

## Migration Methods

### Method 1: Automatic Migration (Recommended)

Flyway runs automatically when the Spring Boot application starts.

**Steps:**

1. **Start the database (if not running):**
   ```powershell
   docker compose -f infra/docker-compose.yml up -d
   ```

2. **Verify database is accessible:**
   ```powershell
   docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT version();"
   ```

3. **Start the Spring Boot application:**
   ```powershell
   cd auth-backend
   .\start.ps1
   # OR
   .\start.bat
   ```

Flyway will automatically:
- Detect new migration files (V8 and V9)
- Run them in order
- Track migration history in `flyway_schema_history` table

**Check logs for migration status:**
Look for Flyway logs in the console output:
```
Flyway Community Edition 9.x.x by Redgate
Database: jdbc:postgresql://localhost:5432/itcenter_auth
Successfully validated 9 migrations (execution time 00:00.123s)
Current version of schema "public": 7
Migrating schema "public" to version "8 - leave attendance"
Migrating schema "public" to version "9 - seed leave policies"
Successfully applied 2 migrations to schema "public" (execution time 00:00.456s)
```

### Method 2: Manual Migration via Maven Flyway Plugin

You can run migrations manually using Maven:

**Check migration status:**
```powershell
cd auth-backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'  # Set if needed
.\mvnw.cmd flyway:info
```

**Run migrations:**
```powershell
cd auth-backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'  # Set if needed
.\mvnw.cmd flyway:migrate
```

**Repair Flyway metadata (if needed):**
```powershell
.\mvnw.cmd flyway:repair
```

### Method 3: Manual SQL Execution (Not Recommended)

If you need to run migrations manually via SQL:

1. **Connect to database:**
   ```powershell
   docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth
   ```

2. **Execute migration files:**
   ```sql
   -- Copy contents of V8__leave_attendance.sql
   -- Copy contents of V9__seed_leave_policies.sql
   -- Execute them manually
   ```

3. **Mark as migrated in Flyway (if needed):**
   ```sql
   INSERT INTO flyway_schema_history 
   (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
   VALUES 
   (8, '8', 'leave attendance', 'SQL', 'V8__leave_attendance.sql', 0, 'itcenter', CURRENT_TIMESTAMP, 0, true),
   (9, '9', 'seed leave policies', 'SQL', 'V9__seed_leave_policies.sql', 0, 'itcenter', CURRENT_TIMESTAMP, 0, true);
   ```

## Verify Migrations Were Applied

### 1. Check Flyway History

```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT version, description, installed_on, success FROM flyway_schema_history ORDER BY installed_rank;"
```

Expected output should show V8 and V9:
```
 version |     description     |      installed_on       | success 
---------+---------------------+------------------------+---------
 1       | init schema         | 2024-...               | t
 ...
 8       | leave attendance    | 2024-...               | t
 9       | seed leave policies | 2024-...               | t
```

### 2. Check Tables Exist

```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "\dt leave_*"
```

Should show:
```
                     List of relations
 Schema |       Name        | Type  |  Owner   
--------+-------------------+-------+----------
 public | leave_audit       | table | itcenter
 public | leave_balances    | table | itcenter
 public | leave_policies   | table | itcenter
 public | leave_requests   | table | itcenter
 public | attendance_logs   | table | itcenter
```

### 3. Check Leave Policies Were Seeded

```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT type, max_days, carry_forward FROM leave_policies;"
```

Expected output:
```
  type   | max_days | carry_forward 
---------+----------+---------------
 ANNUAL  |       20 | t
 CASUAL  |       10 | f
 SICK    |        7 | f
```

### 4. Check Table Structure

```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "\d leave_requests"
```

This will show the full structure of the leave_requests table.

## Troubleshooting

### Migration Already Applied

If you see an error like "Migration V8 already applied":
- This is normal if migrations were already run
- Check `flyway_schema_history` to see current state

### Migration Failed

1. **Check error logs:**
   ```powershell
   # Look in Spring Boot logs
   cd auth-backend
   Get-Content logs/auth-api.log -Tail 50
   ```

2. **Check database state:**
   ```powershell
   docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT * FROM flyway_schema_history WHERE success = false;"
   ```

3. **Repair and retry:**
   ```powershell
   cd auth-backend
   .\mvnw.cmd flyway:repair
   .\mvnw.cmd flyway:migrate
   ```

### Rollback Migrations

**Note:** Flyway doesn't support automatic rollback. If you need to rollback:

1. **Manual SQL rollback:**
   ```sql
   -- Drop tables
   DROP TABLE IF EXISTS leave_audit CASCADE;
   DROP TABLE IF EXISTS leave_balances CASCADE;
   DROP TABLE IF EXISTS leave_requests CASCADE;
   DROP TABLE IF EXISTS attendance_logs CASCADE;
   DROP TABLE IF EXISTS leave_policies CASCADE;
   
   -- Remove from Flyway history
   DELETE FROM flyway_schema_history WHERE version IN ('8', '9');
   ```

2. **Or restore from backup before migrations**

## Quick Migration Checklist

- [ ] Database container is running (`docker ps | findstr itcenter_pg`)
- [ ] Database is accessible (`docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth`)
- [ ] Migration files exist in `auth-backend/src/main/resources/db/migration/`
- [ ] Start Spring Boot application
- [ ] Check Flyway logs show V8 and V9 migrations applied
- [ ] Verify tables exist: `\dt leave_*` and `\dt attendance_*`
- [ ] Verify policies seeded: `SELECT * FROM leave_policies;`

## After Migrations

Once migrations are complete:

1. **Start Node.js backend:**
   ```powershell
   cd leave-attendance-api
   npm install
   npm run dev
   ```

2. **Test API endpoints:**
   ```powershell
   # Get leave policies (should return seeded data)
   curl http://localhost:8082/api/v1/leave/balance -H "Authorization: Bearer <token>"
   ```

3. **Verify in application:**
   - React web: Check Leave pages work
   - Flutter mobile: Check Leave and Attendance screens work

