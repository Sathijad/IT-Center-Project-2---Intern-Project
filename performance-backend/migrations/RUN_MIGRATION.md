# How to Run Phase 6 SQL Migration on RDS

## Using pgAdmin (Easiest)

1. **Open pgAdmin** and connect to your RDS PostgreSQL instance
2. **Navigate to**: `Servers` → Your RDS Server → `Databases` → `itcenter_auth`
3. **Right-click** on `itcenter_auth` → Select **"Query Tool"**
4. **Open the SQL file**:
   - Click **File** → **Open**
   - Navigate to: `performance-backend/migrations/20251203_phase6_performance_training.sql`
   - Or copy-paste the entire SQL content
5. **Execute**:
   - Press **F5** or click the **Execute** button (▶)
6. **Verify**:
   - Check the Messages tab for "SUCCESS" messages
   - Refresh the database in pgAdmin (right-click `itcenter_auth` → Refresh)
   - You should see these new tables:
     - `kpis`
     - `kpi_targets`
     - `kpi_actuals`
     - `training_courses`
     - `training_assignments`
     - `training_notes`
     - `import_jobs` (may already exist from Phase 4)

## Using psql Command Line

```bash
# Connect to RDS
psql -h <your-rds-endpoint> -U <username> -d itcenter_auth

# Run the migration
\i performance-backend/migrations/20251203_phase6_performance_training.sql

# Or pipe it directly:
psql -h <your-rds-endpoint> -U <username> -d itcenter_auth -f performance-backend/migrations/20251203_phase6_performance_training.sql
```

## Using AWS RDS Query Editor

1. Go to **AWS Console** → **RDS** → Your database instance
2. Click **"Query Editor"** tab
3. Select database: `itcenter_auth`
4. Copy-paste the entire SQL from `20251203_phase6_performance_training.sql`
5. Click **"Run"**

## Verification Queries

After running the migration, verify tables exist:

```sql
-- Check Phase 6 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('kpis', 'kpi_targets', 'kpi_actuals', 'training_courses', 'training_assignments', 'training_notes', 'import_jobs')
ORDER BY table_name;

-- Check app_users table exists (required)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'app_users';

-- Count rows in each Phase 6 table (should be 0 for new tables)
SELECT 
    'kpis' AS table_name, COUNT(*) AS row_count FROM kpis
UNION ALL
SELECT 'kpi_targets', COUNT(*) FROM kpi_targets
UNION ALL
SELECT 'kpi_actuals', COUNT(*) FROM kpi_actuals
UNION ALL
SELECT 'training_courses', COUNT(*) FROM training_courses
UNION ALL
SELECT 'training_assignments', COUNT(*) FROM training_assignments
UNION ALL
SELECT 'training_notes', COUNT(*) FROM training_notes
UNION ALL
SELECT 'import_jobs', COUNT(*) FROM import_jobs;
```

## Expected Output

After successful execution, you should see in the Messages tab:
- ✅ `SUCCESS: Phase 6 tables created in shared database`
- ✅ `SUCCESS: app_users table exists - Phase 6 can connect to user data`
- List of all user reference relationships:
  - `kpi_targets.user_id -> app_users.id`
  - `kpi_targets.created_by -> app_users.id`
  - `kpi_actuals.user_id -> app_users.id`
  - `training_assignments.assignee_id -> app_users.id`
  - `training_assignments.assigned_by -> app_users.id`
  - `training_notes.author_id -> app_users.id`
  - `import_jobs.requested_by -> app_users.id`

## Troubleshooting

**If you get "permission denied" errors:**
- Make sure you're connected as a user with CREATE TABLE permissions
- Check that you're connected to the correct database (`itcenter_auth`)

**If tables already exist:**
- The SQL is idempotent (safe to run multiple times)
- It uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` so it won't fail

**If you see "extension uuid-ossp does not exist":**
- The migration includes `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- If this fails, contact your RDS administrator to enable the extension
- Or run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` manually first

**If import_jobs table already exists from Phase 4:**
- That's fine! The migration will add the `job_type` column if it doesn't exist
- The table structure is compatible between Phase 4 and Phase 6

## Quick Verification Checklist

After running the migration:

- [ ] See "SUCCESS" messages in Query Tool Messages tab
- [ ] Can see 7 tables in pgAdmin: `kpis`, `kpi_targets`, `kpi_actuals`, `training_courses`, `training_assignments`, `training_notes`, `import_jobs`
- [ ] Verification query returns 7 rows (or 6 if `import_jobs` existed before)
- [ ] All tables show 0 rows (empty tables ready for data)

