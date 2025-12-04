# Phase 6 API Testing Guide - Swagger

## Prerequisites

1. **Backend Running**: Performance backend should be running at `http://localhost:5167`
2. **JWT Token**: You need a valid JWT token from Phase 1 (Auth Backend)
3. **Database**: Phase 6 tables should be migrated in RDS

## Access Swagger UI

Open in your browser:
```
http://localhost:5167/swagger
```

## Step 1: Authenticate in Swagger

1. Click the **"Authorize"** button (🔒) at the top right of Swagger UI
2. In the "Value" field, enter: `Bearer <your-jwt-token>`
   - Example: `Bearer eyJraWQiOiJ...` (your full token)
3. Click **"Authorize"**
4. Click **"Close"**
5. You should see a green checkmark indicating you're authenticated

**How to get JWT Token:**
- Login via your admin web app or mobile app
- Copy the `access_token` from browser localStorage or app storage
- Or use Postman/curl to login to Phase 1 auth backend

---

## Endpoint Testing Guide

### 1. Health Check (No Auth Required)

**Endpoint:** `GET /healthz`

**Steps:**
1. Find the `/healthz` endpoint
2. Click **"Try it out"**
3. Click **"Execute"**
4. **Expected Response:**
   ```json
   {
     "status": "Healthy",
     "checks": {
       "database": "Healthy"
     }
   }
   ```

**Purpose:** Verify backend is running and database is connected

---

### 2. Get KPI Metrics (Snapshot)

**Endpoint:** `GET /api/v1/perf/metrics`

**Description:** Get current KPI snapshot values for a user/team

**Parameters:**
- `user_id` (optional, number): Filter by user ID
- `team_id` (optional, number): Filter by team ID  
- `kpi` (optional, string): Filter by specific KPI code
- `range` (optional, string): Time range - use `"last30days"` or `"2025-01-01,2025-01-31"`

**Steps:**
1. Click **"Try it out"**
2. Enter parameters (or leave empty to get all KPIs):
   - `user_id`: `1` (example)
   - `range`: `last30days`
3. Click **"Execute"**

**Expected Response:**
```json
[
  {
    "kpiCode": "SALES_TARGET",
    "kpiName": "Sales Target",
    "currentValue": 15000.50,
    "targetValue": 20000.00,
    "variance": -4999.50,
    "unit": "USD",
    "lastMeasuredAt": "2025-01-15T10:00:00Z"
  }
]
```

**Note:** If no KPIs exist yet, you'll get an empty array `[]`. You need to create KPIs first (via direct SQL or admin web).

---

### 3. Get KPI Time Series Data

**Endpoint:** `GET /api/v1/perf/metrics/timeseries`

**Description:** Get historical KPI data points over time

**Parameters:** Same as snapshot endpoint

**Steps:**
1. Click **"Try it out"**
2. Enter parameters:
   - `user_id`: `1`
   - `kpi`: `"SALES_TARGET"` (optional)
   - `range`: `last30days`
3. Click **"Execute"**

**Expected Response:**
```json
[
  {
    "kpiCode": "SALES_TARGET",
    "kpiName": "Sales Target",
    "unit": "USD",
    "dataPoints": [
      {
        "timestamp": "2025-01-01T00:00:00Z",
        "value": 12000.00
      },
      {
        "timestamp": "2025-01-15T00:00:00Z",
        "value": 15000.50
      }
    ]
  }
]
```

---

### 4. Create KPI Target

**Endpoint:** `POST /api/v1/perf/targets`

**Description:** Create or set a KPI target for a user/team/period

**Steps:**
1. Click **"Try it out"**
2. Click on the request body example to edit it
3. Enter JSON body:
   ```json
   {
     "kpiId": "00000000-0000-0000-0000-000000000001",
     "userId": 1,
     "teamId": null,
     "periodType": "MONTHLY",
     "periodStart": "2025-01-01",
     "periodEnd": "2025-01-31",
     "targetValue": 20000.00
   }
   ```
4. Click **"Execute"**

**Expected Response (201 Created):**
```json
{
  "targetId": "550e8400-e29b-41d4-a716-446655440000",
  "kpiId": "00000000-0000-0000-0000-000000000001",
  "kpiCode": "SALES_TARGET",
  "kpiName": "Sales Target",
  "userId": 1,
  "teamId": null,
  "periodType": "MONTHLY",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "targetValue": 20000.00,
  "createdBy": 1,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**Note:** You need a valid `kpiId` from the `kpis` table. Create KPIs first via SQL or admin web.

**Period Types:** `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`

---

### 5. Import KPI Actuals (CSV Upload)

**Endpoint:** `POST /api/v1/perf/actuals/import`

**Description:** Upload a CSV file to import KPI actual values

**Steps:**
1. Click **"Try it out"**
2. Click **"Choose File"** and select a CSV file
3. CSV Format should be:
   ```csv
   kpi_code,user_id,measured_at,value
   SALES_TARGET,1,2025-01-15T10:00:00Z,15000.50
   CUSTOMER_SATISFACTION,1,2025-01-15T10:00:00Z,4.5
   ```
4. Click **"Execute"**

**Expected Response (202 Accepted):**
```json
{
  "jobId": "660e8400-e29b-41d4-a716-446655440001",
  "jobType": "KPI_ACTUALS",
  "status": "QUEUED",
  "processedCount": 0,
  "failedCount": 0,
  "errorDetails": null,
  "createdAt": "2025-01-15T10:00:00Z",
  "startedAt": null,
  "completedAt": null
}
```

**Note:** The import runs in the background. Use the next endpoint to check status.

---

### 6. Check Import Job Status

**Endpoint:** `GET /api/v1/imports/{jobId}`

**Description:** Check the status of an import job

**Steps:**
1. Click **"Try it out"**
2. Enter the `jobId` from the previous import response:
   - Example: `660e8400-e29b-41d4-a716-446655440001`
3. Click **"Execute"**

**Expected Response:**
```json
{
  "jobId": "660e8400-e29b-41d4-a716-446655440001",
  "jobType": "KPI_ACTUALS",
  "status": "COMPLETED",
  "processedCount": 2,
  "failedCount": 0,
  "errorDetails": null,
  "createdAt": "2025-01-15T10:00:00Z",
  "startedAt": "2025-01-15T10:00:01Z",
  "completedAt": "2025-01-15T10:00:05Z"
}
```

**Status Values:** `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`

---

### 7. Get Training Courses

**Endpoint:** `GET /api/v1/training/courses`

**Description:** Search and list training courses

**Parameters:**
- `query` (optional, string): Search term for course title/description
- `page` (optional, number): Page number (default: 1)
- `size` (optional, number): Page size (default: 20)

**Steps:**
1. Click **"Try it out"**
2. Enter parameters:
   - `query`: `"safety"` (optional)
   - `page`: `1`
   - `size`: `20`
3. Click **"Execute"**

**Expected Response:**
```json
{
  "items": [
    {
      "courseId": "770e8400-e29b-41d4-a716-446655440002",
      "title": "Workplace Safety Training",
      "description": "Comprehensive safety training course",
      "provider": "Internal",
      "modality": "ONLINE",
      "teamsMeetingUrl": "https://teams.microsoft.com/...",
      "sharepointUrl": "https://sharepoint.com/...",
      "onedriveUrl": "https://onedrive.com/...",
      "durationMinutes": 120,
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "page": 1,
  "size": 20,
  "totalCount": 1
}
```

**Note:** If no courses exist, you'll get an empty `items` array. Create courses first.

---

### 8. Assign Training Course

**Endpoint:** `POST /api/v1/training/assign`

**Description:** Assign a training course to a user, team, or cohort

**Steps:**
1. Click **"Try it out"**
2. Enter JSON body:
   ```json
   {
     "courseId": "770e8400-e29b-41d4-a716-446655440002",
     "assigneeType": "USER",
     "assigneeId": 1,
     "cohortId": null,
     "dueDate": "2025-02-01T23:59:59Z"
   }
   ```
3. Click **"Execute"**

**Expected Response (201 Created):**
```json
[
  {
    "assignmentId": "880e8400-e29b-41d4-a716-446655440003",
    "courseId": "770e8400-e29b-41d4-a716-446655440002",
    "courseTitle": "Workplace Safety Training",
    "assigneeType": "USER",
    "assigneeId": 1,
    "cohortId": null,
    "dueDate": "2025-02-01T23:59:59Z",
    "status": "ASSIGNED",
    "progress": 0,
    "completedAt": null,
    "assignedBy": 1,
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
]
```

**Assignee Types:**
- `USER`: Assign to specific user (requires `assigneeId`)
- `TEAM`: Assign to team (requires `teamId` - not implemented yet)
- `COHORT`: Assign to cohort (requires `cohortId`)

**Note:** You need a valid `courseId` from the courses table.

---

### 9. Update Training Assignment

**Endpoint:** `PATCH /api/v1/training/assignments/{assignmentId}`

**Description:** Update assignment progress, status, or completion

**Steps:**
1. Click **"Try it out"**
2. Enter the `assignmentId` from a previous assignment:
   - Example: `880e8400-e29b-41d4-a716-446655440003`
3. Enter JSON body (all fields optional):
   ```json
   {
     "status": "IN_PROGRESS",
     "progress": 50,
     "completedAt": null
   }
   ```
   Or to mark as completed:
   ```json
   {
     "status": "COMPLETED",
     "progress": 100,
     "completedAt": "2025-01-20T10:00:00Z"
   }
   ```
4. Click **"Execute"**

**Expected Response (200 OK):**
```json
{
  "assignmentId": "880e8400-e29b-41d4-a716-446655440003",
  "courseId": "770e8400-e29b-41d4-a716-446655440002",
  "courseTitle": "Workplace Safety Training",
  "assigneeType": "USER",
  "assigneeId": 1,
  "status": "IN_PROGRESS",
  "progress": 50,
  "completedAt": null,
  "assignedBy": 1,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:05:00Z"
}
```

**Status Values:** `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE`, `CANCELLED`
**Progress:** 0-100 (percentage)

---

### 10. Send Training Notifications

**Endpoint:** `POST /api/v1/notify/staff`

**Description:** Queue training reminder notifications (email/Teams)

**Steps:**
1. Click **"Try it out"**
2. Enter JSON body (all fields optional, use filters):
   ```json
   {
     "assignmentIds": null,
     "userId": 1,
     "teamId": null,
     "overdueOnly": true,
     "incompleteOnly": true
   }
   ```
   Or notify specific assignments:
   ```json
   {
     "assignmentIds": [
       "880e8400-e29b-41d4-a716-446655440003"
     ],
     "userId": null,
     "teamId": null,
     "overdueOnly": false,
     "incompleteOnly": false
   }
   ```
3. Click **"Execute"**

**Expected Response (202 Accepted):**
```json
{
  "queued": 5,
  "message": "Notifications queued for processing"
}
```

**Note:** Notifications are processed asynchronously. Check Hangfire dashboard at `/jobs` to see job status.

---

## Testing Workflow Examples

### Workflow 1: Create KPI and Track Performance

1. **Create KPI** (via SQL or admin web - not in Swagger)
2. **Create Target**: `POST /api/v1/perf/targets`
3. **Import Actuals**: `POST /api/v1/perf/actuals/import` (upload CSV)
4. **Check Import Status**: `GET /api/v1/imports/{jobId}`
5. **View Metrics**: `GET /api/v1/perf/metrics`
6. **View Time Series**: `GET /api/v1/perf/metrics/timeseries`

### Workflow 2: Assign and Track Training

1. **List Courses**: `GET /api/v1/training/courses`
2. **Assign Training**: `POST /api/v1/training/assign`
3. **Update Progress**: `PATCH /api/v1/training/assignments/{id}`
4. **Send Reminders**: `POST /api/v1/notify/staff`

---

## Common Issues & Solutions

### Issue: "401 Unauthorized"
**Solution:** Make sure you clicked "Authorize" and entered your JWT token correctly with `Bearer ` prefix

### Issue: "404 Not Found" for endpoints
**Solution:** Check that backend is running on port 5167 and Swagger is accessible

### Issue: Empty arrays in responses
**Solution:** You need to create data first:
- For KPIs: Create records in `kpis` table via SQL
- For Courses: Use admin web or create via SQL

### Issue: "500 Internal Server Error"
**Solution:** 
- Check backend console logs
- Verify database connection
- Ensure Phase 6 tables exist in RDS

### Issue: Import job stays in "QUEUED" status
**Solution:** 
- Check Hangfire dashboard at `http://localhost:5167/jobs`
- Verify Hangfire worker is running
- Check backend logs for errors

---

## Quick Test Data (SQL)

To test endpoints, you can insert sample data:

```sql
-- Create a sample KPI
INSERT INTO kpis (kpi_id, code, name, description, unit, category, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'SALES_TARGET',
  'Sales Target',
  'Monthly sales target',
  'USD',
  'Sales',
  true
);

-- Create a sample training course
INSERT INTO training_courses (course_id, title, description, modality, is_active)
VALUES (
  '770e8400-e29b-41d4-a716-446655440002',
  'Workplace Safety Training',
  'Comprehensive safety training course',
  'ONLINE',
  true
);
```

---

## Next Steps

After testing in Swagger:
1. Test via Admin Web UI (React pages)
2. Test via Mobile App (Flutter screens)
3. Test with Postman collections
4. Run automated tests

