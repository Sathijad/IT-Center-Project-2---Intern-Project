# How to Run Phase 4 SQL Migration on RDS

## Using pgAdmin (Easiest)

1. **Open pgAdmin** and connect to your RDS PostgreSQL instance
2. **Navigate to**: `Servers` → Your RDS Server → `Databases` → `itcenter_auth`
3. **Right-click** on `itcenter_auth` → Select **"Query Tool"**
4. **Open the SQL file**:
   - Click **File** → **Open**
   - Navigate to: `schedules-backend/migrations/20251125_phase4_schedules.sql`
   - Or copy-paste the entire SQL content
5. **Execute**:
   - Press **F5** or click the **Execute** button (▶)
6. **Verify**:
   - Check the Messages tab for "SUCCESS" messages
   - Refresh the database in pgAdmin
   - You should see these new tables:
     - `recurrences`
     - `schedules`
     - `tasks`
     - `task_notes`
     - `import_jobs`

## Using psql Command Line

```bash
# Connect to RDS
psql -h <your-rds-endpoint> -U <username> -d itcenter_auth

# Run the migration
\i schedules-backend/migrations/20251125_phase4_schedules.sql

# Or pipe it directly:
psql -h <your-rds-endpoint> -U <username> -d itcenter_auth -f schedules-backend/migrations/20251125_phase4_schedules.sql
```

## Using AWS RDS Query Editor

1. Go to **AWS Console** → **RDS** → Your database instance
2. Click **"Query Editor"** tab
3. Select database: `itcenter_auth`
4. Copy-paste the entire SQL from `20251125_phase4_schedules.sql`
5. Click **"Run"**

## Verification Queries

After running the migration, verify tables exist:

```sql
-- Check Phase 4 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('schedules', 'tasks', 'task_notes', 'recurrences', 'import_jobs')
ORDER BY table_name;

-- Check app_users table exists (required)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'app_users';

-- Count rows in each Phase 4 table
SELECT 
    'schedules' AS table_name, COUNT(*) AS row_count FROM schedules
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'task_notes', COUNT(*) FROM task_notes
UNION ALL
SELECT 'recurrences', COUNT(*) FROM recurrences
UNION ALL
SELECT 'import_jobs', COUNT(*) FROM import_jobs;
```

## Expected Output

After successful execution, you should see:
- ✅ `SUCCESS: Phase 4 tables created in shared database`
- ✅ `SUCCESS: app_users table exists - Phase 4 can connect to user data`
- List of all user reference relationships

## Troubleshooting

**If you get "permission denied" errors:**
- Make sure you're connected as a user with CREATE TABLE permissions
- Check that you're connected to the correct database (`itcenter_auth`)

**If tables already exist:**
- The SQL is idempotent (safe to run multiple times)
- It uses `CREATE TABLE IF NOT EXISTS` so it won't fail

**If you see "extension uuid-ossp does not exist":**
- Contact your RDS administrator to enable the extension
- Or run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` manually first

