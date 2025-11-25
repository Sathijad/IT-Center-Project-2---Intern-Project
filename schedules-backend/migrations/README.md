# Phase 4 Database Migration

## Database Connection

**All phases use the same database:**
- **Local Development**: `itcenter_auth` (Docker PostgreSQL)
- **RDS Production**: `itcenter_auth` (AWS RDS PostgreSQL)

## Migration File

**File**: `20251125_phase4_schedules.sql`

Run this SQL directly on your RDS database using:
- pgAdmin
- AWS RDS Query Editor
- psql command line

## Tables Created

1. **recurrences** - Recurrence patterns for schedules
2. **schedules** - User schedules and calendar events
3. **tasks** - Task items assigned to users
4. **task_notes** - Comments/notes on tasks
5. **import_jobs** - CSV import job tracking

## Relationships to app_users Table

Phase 4 tables reference `app_users.id` through these columns:

| Table | Column | References | Purpose |
|-------|--------|------------|---------|
| `schedules` | `user_id` | `app_users.id` | User who owns the schedule |
| `schedules` | `created_by` | `app_users.id` | User who created the schedule |
| `tasks` | `assignee_id` | `app_users.id` | User assigned to the task |
| `tasks` | `created_by` | `app_users.id` | User who created the task |
| `task_notes` | `author_id` | `app_users.id` | User who wrote the note |
| `import_jobs` | `requested_by` | `app_users.id` | User who requested the import |

**Note**: Following Phase 3 pattern, explicit FOREIGN KEY constraints are not added. The application layer enforces referential integrity.

## Verification

After running the migration, the SQL will output:
1. Confirmation that Phase 4 tables were created
2. Confirmation that `app_users` table exists
3. List of all user reference relationships

## Deployment Steps

1. **Before deploying Phase 4 API:**
   - Run `migrations/20251125_phase4_schedules.sql` on RDS
   - Verify all tables are created successfully
   - Verify `app_users` table exists

2. **After running SQL:**
   - Phase 4 API will connect to the same `itcenter_auth` database
   - All tables will be visible in pgAdmin
   - Data will be shared with Phase 1, 2, and 3 modules

