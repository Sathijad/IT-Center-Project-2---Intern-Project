# Flyway Migration Troubleshooting Guide

## Quick Start

If V9 migration ran but you don't see tables in pgAdmin, follow these steps:

### Step 1: Run Comprehensive Diagnostic
```powershell
.\diagnose-flyway.ps1
```

This will check:
- ✅ Database connection
- ✅ Flyway schema history
- ✅ V9 migration status
- ✅ Table existence in correct schema
- ✅ Migration file location
- ✅ Schema mismatches

### Step 2: Verify Tables
```powershell
.\verify-phase2-tables.ps1
```

### Step 3: Repair if Needed
```powershell
.\repair-flyway.ps1
```

## Common Issues and Solutions

### Issue 1: V9 Didn't Run

**Symptoms:**
- No V9 row in `flyway_schema_history`
- Tables don't exist

**Causes:**
1. File not found (wrong path/name)
2. Flyway disabled
3. Wrong classpath
4. Target version set incorrectly

**Solutions:**
```powershell
# Check file exists
Test-Path "auth-backend/src/main/resources/db/migration/V9__recreate_phase2_tables.sql"

# Verify Flyway is enabled in application.yml
# spring.flyway.enabled=true

# Run migration manually
cd auth-backend
mvn flyway:migrate

# Or start Spring Boot (migrations run automatically)
.\mvnw spring-boot:run
```

### Issue 2: Wrong Database/Schema

**Symptoms:**
- Tables exist but not visible in pgAdmin
- Different schema than expected

**Check:**
```sql
-- In pgAdmin or psql
SELECT current_database(), current_schema();
SHOW search_path;

-- Check Spring Boot config
-- spring.flyway.schemas=public (or your schema)
```

**Solution:**
- Make sure you're looking in the correct schema in pgAdmin
- Check `spring.flyway.schemas` in `application.yml`
- Default is `public` schema

### Issue 3: V9 Failed

**Symptoms:**
- V9 row in history with `success=false`
- Error in logs

**Solution:**
```powershell
# Repair and rerun
.\repair-flyway.ps1

# Or manually
cd auth-backend
mvn flyway:repair
mvn flyway:migrate
```

### Issue 4: Dev Profile Using H2

**Symptoms:**
- Tables created in H2 (in-memory), not PostgreSQL

**Check:**
```yaml
# application-dev.yml
spring:
  datasource:
    url: jdbc:postgresql://...  # Should be PostgreSQL, not H2
```

**Solution:**
- Ensure PostgreSQL connection string
- Check profile being used: `spring.profiles.active`

### Issue 5: Target Version Blocking

**Symptoms:**
- V9 exists but won't run
- Target version set to 8 or lower

**Check:**
```yaml
# application.yml
spring:
  flyway:
    target:  # Should be empty or >= 9
```

**Solution:**
- Remove or update `spring.flyway.target`
- Or set to `9` or higher

## Manual SQL Queries

### Check Flyway History
```sql
SELECT 
    installed_rank,
    version,
    description,
    type,
    script,
    installed_by,
    installed_on,
    success,
    checksum
FROM flyway_schema_history
ORDER BY installed_rank;
```

### Check if Tables Exist
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'  -- or your schema
  AND tablename IN (
    'attendance_logs',
    'leave_requests',
    'leave_audit',
    'leave_balances',
    'leave_policies'
  )
ORDER BY tablename;
```

### Check Current Database/Schema
```sql
SELECT current_database(), current_schema();
SHOW search_path;
```

## Scripts Reference

### diagnose-flyway.ps1
Comprehensive diagnostic tool that checks all common issues.

**Usage:**
```powershell
.\diagnose-flyway.ps1

# With custom connection
.\diagnose-flyway.ps1 -Host localhost -Port 5432 -Database itcenter_auth -User itcenter -Password password -Schema public
```

### verify-phase2-tables.ps1
Quick verification that tables exist in the correct schema.

**Usage:**
```powershell
.\verify-phase2-tables.ps1

# With custom schema
.\verify-phase2-tables.ps1 -Schema itcenter_auth
```

### repair-flyway.ps1
Repairs Flyway schema history and reruns migrations.

**Usage:**
```powershell
.\repair-flyway.ps1

# Repair only (no migrate)
.\repair-flyway.ps1 -SkipMigrate

# Migrate only (no repair)
.\repair-flyway.ps1 -SkipRepair
```

## Spring Boot Configuration

### application.yml (Current)
```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    baseline-version: 0
    validate-on-migrate: false
    repair-on-migrate: true
    out-of-order: true
    # schemas: public  # Default if not specified
    # target:          # Should be empty or >= 9
```

### Verify in Startup Logs
Look for these lines when Spring Boot starts:
```
Flyway Community Edition ...
Current version of schema "public": 8
Migrating schema "public" to version "9 - recreate phase2 tables"
```

If you don't see Flyway banner, Flyway may be disabled.

## Quick Checklist

- [ ] Run `.\diagnose-flyway.ps1` to identify issues
- [ ] Verify migration file exists: `V9__recreate_phase2_tables.sql`
- [ ] Check Flyway is enabled: `spring.flyway.enabled=true`
- [ ] Verify database connection matches Spring Boot config
- [ ] Check schema matches (default is `public`)
- [ ] Run `.\repair-flyway.ps1` if migrations failed
- [ ] Run `.\verify-phase2-tables.ps1` to confirm tables exist
- [ ] Check Spring Boot startup logs for Flyway messages

## Need More Help?

1. Check Spring Boot startup logs for Flyway output
2. Check PostgreSQL logs for errors
3. Verify database user has CREATE permissions
4. Ensure schema exists (usually `public` is created automatically)
5. Check if other migrations are blocking V9

