# Phase 6 - Performance & Training Module Implementation Summary

## Overview
Phase 6 implements the Staff Performance & Training module with a new ASP.NET Core backend, React admin web pages, and Flutter mobile app features.

## Backend Implementation (performance-backend)

### Structure
- **Location**: `performance-backend/`
- **Technology**: ASP.NET Core 9.0, Entity Framework Core, PostgreSQL
- **Port**: 5167 (local development)

### Database Schema
Migration file: `migrations/20251203_phase6_performance_training.sql`

**Tables Created:**
- `kpis` - Master list of KPI definitions
- `kpi_targets` - Per-user/team/period targets
- `kpi_actuals` - Measured KPI values over time
- `training_courses` - Catalog of training courses
- `training_assignments` - Links users/groups/cohorts to courses
- `training_notes` - Free-form notes/feedback per assignment
- `import_jobs` - Tracks KPI import job status

All tables reference `app_users.id` from the shared database (Phase 1).

### API Endpoints

#### Performance Metrics
- `GET /api/v1/perf/metrics?user_id=&range=&kpi=` - Return KPI snapshot
- `GET /api/v1/perf/metrics/timeseries?user_id=&range=&kpi=` - Return time-series data
- `POST /api/v1/perf/targets` - Create or update KPI targets

#### Imports
- `POST /api/v1/perf/actuals/import` - Upload CSV file for KPI actuals import
- `GET /api/v1/imports/{job_id}` - Check import job status

#### Training
- `GET /api/v1/training/courses?query=&page=&size=` - Search/list courses
- `POST /api/v1/training/assign` - Assign training courses
- `PATCH /api/v1/training/assignments/{id}` - Update assignment progress/status

#### Notifications
- `POST /api/v1/notify/staff` - Queue reminders/Teams invites

#### Health
- `GET /healthz` - Service health check

### Key Components

**Domain Models:**
- `Kpi`, `KpiTarget`, `KpiActual`
- `TrainingCourse`, `TrainingAssignment`, `TrainingNote`
- `ImportJob`

**Services:**
- `MetricsService` - KPI metrics querying
- `KpiTargetService` - Target management
- `ImportService` - Import job handling
- `TrainingCourseService` - Course catalog management
- `TrainingAssignmentService` - Assignment handling
- `NotificationService` - Notification queuing

**Workers:**
- `KpiImportWorker` - Processes CSV imports for KPI actuals
- `TrainingNotificationWorker` - Sends training reminders via email/Teams

**Integrations:**
- `MsGraphClient` - Microsoft Graph API for Teams meetings
- `SesEmailService` - AWS SES for email notifications
- SharePoint/OneDrive links stored in training courses

### Configuration
- Database connection: Uses shared RDS PostgreSQL database (`itcenter_auth`)
- Authentication: JWT Bearer tokens (Cognito)
- Background jobs: Hangfire with PostgreSQL storage
- Graph API: Configurable via `Graph` section in appsettings
- SES: Configurable via `AWS` section in appsettings

## Admin Web Implementation (admin-web)

### API Client
- **File**: `src/lib/performanceApi.ts`
- Provides typed functions for all Phase 6 endpoints
- Uses separate axios instance for performance backend

### Pages (To Be Created)
- KPI Management page
- KPI Reports/Dashboard page
- Training Course Catalog page
- Training Assignments page
- KPI Import page

### Navigation
- Add "Performance & Training" section to Layout navigation
- Include links to KPI management, training courses, assignments

## Mobile App Implementation (mobile-app)

### Features (To Be Created)
- KPI Dashboard view
- Training Overview view
- Training Detail view with Teams/SharePoint/OneDrive links

### API Integration
- Extend `ApiClient` or create `PerformanceApiClient`
- Add screens for KPI metrics and training assignments

## Database Migration

### Running Migrations
1. Connect to RDS PostgreSQL database via pgAdmin
2. Open `performance-backend/migrations/20251203_phase6_performance_training.sql`
3. Execute the SQL script
4. Verify tables were created successfully

### Verification Queries
```sql
-- Check Phase 6 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('kpis', 'kpi_targets', 'kpi_actuals', 'training_courses', 'training_assignments', 'training_notes', 'import_jobs');
```

## Local Development

### Starting the Backend
```powershell
cd performance-backend
.\start-backend.ps1
```

Backend will be available at:
- API: http://localhost:5167
- Swagger: http://localhost:5167/swagger
- Health: http://localhost:5167/healthz
- Hangfire Dashboard: http://localhost:5167/jobs

### Environment Variables
For local development, update `appsettings.Development.json`:
```json
{
  "ConnectionStrings": {
    "PerformanceDb": "Host=localhost;Port=5432;Database=itcenter_auth;Username=postgres;Password=postgres;"
  }
}
```

## Next Steps

1. **Complete Admin Web Pages:**
   - Create KPI management UI
   - Create training course catalog UI
   - Create training assignments UI
   - Add navigation links

2. **Complete Mobile App:**
   - Create KPI dashboard screen
   - Create training overview screen
   - Integrate with Phase 6 API

3. **Testing:**
   - Unit tests for services
   - Integration tests for API endpoints
   - E2E tests for admin web
   - Mobile app tests

4. **Documentation:**
   - API documentation
   - User guides
   - Deployment guide

## Notes

- All Phase 6 tables use the same shared RDS database as other phases
- Foreign key relationships to `app_users` are enforced at application level (following Phase 4 pattern)
- CSV import format for KPI actuals: `kpi_code,user_id,measured_at,value`
- Training notifications are queued via Hangfire and processed asynchronously
- Graph API and SES integrations are optional (fallback to no-op implementations if not configured)

