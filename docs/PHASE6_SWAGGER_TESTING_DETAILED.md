# Phase 6 API - Complete Swagger Testing Guide

## Prerequisites

1. **Backend Running**: `http://localhost:5167`
2. **Swagger UI**: `http://localhost:5167/swagger`
3. **JWT Token**: Get from Phase 1 auth backend (login via admin web or mobile app)

---

## Step 1: Authenticate in Swagger

1. Open `http://localhost:5167/swagger`
2. Click the **"Authorize"** button (🔒) at the top right
3. In the "Value" field, enter: `Bearer <your-jwt-token>`
   - Example: `Bearer eyJraWQiOiJcXFwiLCJhbGciOiJSUzI1NiJ9...`
4. Click **"Authorize"**
5. Click **"Close"**
6. You should see a green checkmark ✅

**How to get JWT Token:**
- Login via admin web app → Open browser DevTools → Application → Local Storage → Copy `access_token`
- Or login via mobile app and extract token from storage

---

## Step 2: Test Health Check (No Auth Required)

### `GET /healthz`

1. Find the `/healthz` endpoint
2. Click **"Try it out"**
3. Click **"Execute"**
4. **Expected Response (200 OK):**
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

## Step 3: Create a KPI First

### `POST /api/v1/perf/kpis`

**Why:** You need KPIs before creating targets or importing actuals

1. Find `POST /api/v1/perf/kpis`
2. Click **"Try it out"**
3. Click on the request body example
4. Replace with this JSON:
   ```json
   {
     "code": "SALES_TARGET",
     "name": "Sales Target",
     "description": "Monthly sales target for sales team",
     "unit": "USD",
     "category": "Sales",
     "calculationHint": "Sum of all sales transactions in the period"
   }
   ```
5. Click **"Execute"**
6. **Expected Response (201 Created):**
   ```json
   {
     "kpiId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
     "code": "SALES_TARGET",
     "name": "Sales Target",
     "description": "Monthly sales target for sales team",
     "unit": "USD",
     "category": "Sales",
     "calculationHint": "Sum of all sales transactions in the period",
     "isActive": true,
     "createdAt": "2025-12-03T12:00:00Z",
     "updatedAt": "2025-12-03T12:00:00Z"
   }
   ```
7. **IMPORTANT:** Copy the `kpiId` - you'll need it for the next steps!

**Create More KPIs (Optional):**
```json
{
  "code": "CUSTOMER_SATISFACTION",
  "name": "Customer Satisfaction Score",
  "description": "Average customer satisfaction rating",
  "unit": "Rating",
  "category": "Customer Service",
  "calculationHint": "Average of all customer survey ratings"
}
```

---

## Step 4: List All KPIs

### `GET /api/v1/perf/kpis`

1. Find `GET /api/v1/perf/kpis`
2. Click **"Try it out"**
3. Click **"Execute"**
4. **Expected Response (200 OK):**
   ```json
   [
     {
       "kpiId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
       "code": "SALES_TARGET",
       "name": "Sales Target",
       "description": "Monthly sales target for sales team",
       "unit": "USD",
       "category": "Sales",
       "calculationHint": "Sum of all sales transactions in the period",
       "isActive": true,
       "createdAt": "2025-12-03T12:00:00Z",
       "updatedAt": "2025-12-03T12:00:00Z"
     }
   ]
   ```

**Purpose:** Verify KPIs were created and get their IDs

---

## Step 5: Get Specific KPI

### `GET /api/v1/perf/kpis/{kpiId}`

1. Find `GET /api/v1/perf/kpis/{kpiId}`
2. Click **"Try it out"**
3. Enter the `kpiId` from Step 3:
   - Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
4. Click **"Execute"**
5. **Expected Response (200 OK):** Same as Step 4, but single KPI object

---

## Step 6: Create KPI Target

### `POST /api/v1/perf/targets`

**Use the `kpiId` from Step 3!** 6c00afb4-7a5e-4ff4-9023-f7cb8aa041c9

1. Find `POST /api/v1/perf/targets`
2. Click **"Try it out"**
3. Replace request body with:
   ```json
   {
     "kpiId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
     "userId": 1,
     "teamId": null,
     "periodType": "MONTHLY",
     "periodStart": "2025-01-01",
     "periodEnd": "2025-01-31",
     "targetValue": 20000.00
   }
   ```
4. **Replace `kpiId`** with the actual ID from Step 3
5. **Replace `userId`** with a valid user ID from your `app_users` table
6. Click **"Execute"**
7. **Expected Response (201 Created):**
   ```json
   {
     "targetId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
     "kpiId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
     "kpiCode": "SALES_TARGET",
     "kpiName": "Sales Target",
     "userId": 1,
     "teamId": null,
     "periodType": "MONTHLY",
     "periodStart": "2025-01-01",
     "periodEnd": "2025-01-31",
     "targetValue": 20000.00,
     "createdBy": 1,
     "createdAt": "2025-12-03T12:05:00Z",
     "updatedAt": "2025-12-03T12:05:00Z"
   }
   ```

**Period Types:** `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`

**Note:** If you get "KPI not found", make sure you used the correct `kpiId` from Step 3.

---

## Step 7: Get KPI Metrics (Snapshot)

### `GET /api/v1/perf/metrics`

1. Find `GET /api/v1/perf/metrics`
2. Click **"Try it out"**
3. Enter parameters:
   - `user_id`: `1` (optional - filter by user)
   - `team_id`: (leave empty or enter team ID)
   - `kpi`: `"SALES_TARGET"` (optional - filter by KPI code)
   - `range`: `"last30days"` (optional - time range)
4. Click **"Execute"**
5. **Expected Response (200 OK):**
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

**Note:** If you see empty array `[]`, it means:
- No KPI actuals have been imported yet (use Step 8 to import)
- Or no KPIs match your filters

**Range Options:**
- `"last30days"` - Last 30 days
- `"last7days"` - Last 7 days
- `"2025-01-01,2025-01-31"` - Custom date range

---

## Step 8: Get KPI Time Series Data

### `GET /api/v1/perf/metrics/timeseries`

1. Find `GET /api/v1/perf/metrics/timeseries`
2. Click **"Try it out"**
3. Enter parameters (same as Step 7):
   - `user_id`: `1`
   - `range`: `"last30days"`
   - `kpi`: `"SALES_TARGET"` (optional)
4. Click **"Execute"**
5. **Expected Response (200 OK):**
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

**Purpose:** Get historical data points for charts/graphs

---

## Step 9: Import KPI Actuals (CSV Upload)

### `POST /api/v1/perf/actuals/import`

**First, create a CSV file:**

Create a file named `kpi_actuals.csv` with this content:
```csv
kpi_code,user_id,measured_at,value
SALES_TARGET,1,2025-01-15T10:00:00Z,15000.50
SALES_TARGET,1,2025-01-20T10:00:00Z,18000.75
CUSTOMER_SATISFACTION,1,2025-01-15T10:00:00Z,4.5
```

**Then in Swagger:**

1. Find `POST /api/v1/perf/actuals/import`
2. Click **"Try it out"**
3. Click **"Choose File"** button
4. Select your `kpi_actuals.csv` file
5. Click **"Execute"**
6. **Expected Response (202 Accepted):**
   ```json
   {
     "jobId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
     "jobType": "KPI_ACTUALS",
     "status": "QUEUED",
     "processedCount": 0,
     "failedCount": 0,
     "errorDetails": null,
     "createdAt": "2025-12-03T12:10:00Z",
     "startedAt": null,
     "completedAt": null
   }
   ```
7. **IMPORTANT:** Copy the `jobId` for Step 10!

**CSV Format Requirements:**
- Header row: `kpi_code,user_id,measured_at,value`
- `kpi_code`: Must match a KPI code you created (e.g., "SALES_TARGET")
- `user_id`: Valid user ID from `app_users` table
- `measured_at`: ISO 8601 format (e.g., "2025-01-15T10:00:00Z")
- `value`: Decimal number

---

## Step 10: Check Import Job Status

### `GET /api/v1/imports/{jobId}`

1. Find `GET /api/v1/imports/{jobId}`
2. Click **"Try it out"**
3. Enter the `jobId` from Step 9:
   - Example: `c3d4e5f6-a7b8-9012-cdef-123456789012`
4. Click **"Execute"**
5. **Expected Response (200 OK):**
   ```json
   {
     "jobId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
     "jobType": "KPI_ACTUALS",
     "status": "COMPLETED",
     "processedCount": 3,
     "failedCount": 0,
     "errorDetails": null,
     "createdAt": "2025-12-03T12:10:00Z",
     "startedAt": "2025-12-03T12:10:01Z",
     "completedAt": "2025-12-03T12:10:05Z"
   }
   ```

**Status Values:**
- `QUEUED` - Waiting to process
- `PROCESSING` - Currently importing
- `COMPLETED` - Successfully finished
- `FAILED` - Error occurred (check `errorDetails`)
- `CANCELLED` - Job was cancelled

**Tip:** Refresh this endpoint every few seconds if status is `QUEUED` or `PROCESSING`

---

## Step 11: Get Training Courses

### `GET /api/v1/training/courses`

1. Find `GET /api/v1/training/courses`
2. Click **"Try it out"**
3. Enter parameters:
   - `query`: `"safety"` (optional - search term)
   - `page`: `1` (page number)
   - `size`: `20` (items per page)
4. Click **"Execute"**
5. **Expected Response (200 OK):**
   ```json
   {
     "items": [
       {
         "courseId": "d4e5f6a7-b8c9-0123-def4-234567890123",
         "title": "Workplace Safety Training",
         "description": "Comprehensive safety training course",
         "provider": "Internal",
         "modality": "ONLINE",
         "teamsMeetingUrl": "https://teams.microsoft.com/...",
         "sharepointUrl": "https://sharepoint.com/...",
         "onedriveUrl": "https://onedrive.com/...",
         "durationMinutes": 120,
         "isActive": true,
         "createdAt": "2025-12-03T12:15:00Z",
         "updatedAt": "2025-12-03T12:15:00Z"
       }
     ],
     "page": 1,
     "size": 20,
     "totalCount": 1
   }
   ```

**Note:** If you see empty `items: []`, you need to create courses first (via admin web or SQL)

**To create a course via SQL:**
```sql
INSERT INTO training_courses (course_id, title, description, modality, is_active)
VALUES (
  'd4e5f6a7-b8c9-0123-def4-234567890123',
  'Workplace Safety Training',
  'Comprehensive safety training course',
  'ONLINE',
  true
);
```

---

## Step 12: Assign Training Course

### `POST /api/v1/training/assign`

**You need a `courseId` from Step 11!**

1. Find `POST /api/v1/training/assign`
2. Click **"Try it out"**
3. Replace request body with:
   ```json
   {
     "courseId": "d4e5f6a7-b8c9-0123-def4-234567890123",
     "assigneeType": "USER",
     "assigneeId": 1,
     "cohortId": null,
     "dueDate": "2025-02-01T23:59:59Z"
   }
   ```
4. **Replace `courseId`** with actual ID from Step 11
5. **Replace `assigneeId`** with valid user ID
6. Click **"Execute"**
7. **Expected Response (201 Created):**
   ```json
   [
     {
       "assignmentId": "e5f6a7b8-c9d0-1234-ef56-345678901234",
       "courseId": "d4e5f6a7-b8c9-0123-def4-234567890123",
       "courseTitle": "Workplace Safety Training",
       "assigneeType": "USER",
       "assigneeId": 1,
       "cohortId": null,
       "dueDate": "2025-02-01T23:59:59Z",
       "status": "ASSIGNED",
       "progress": 0,
       "completedAt": null,
       "assignedBy": 1,
       "createdAt": "2025-12-03T12:20:00Z",
       "updatedAt": "2025-12-03T12:20:00Z"
     }
   ]
   ```
8. **IMPORTANT:** Copy the `assignmentId` for Step 13!

**Assignee Types:**
- `USER` - Assign to specific user (requires `assigneeId`)
- `TEAM` - Assign to team (requires `teamId` - not fully implemented)
- `COHORT` - Assign to cohort (requires `cohortId`)

---

## Step 13: Update Training Assignment

### `PATCH /api/v1/training/assignments/{assignmentId}`

**Use the `assignmentId` from Step 12!**

1. Find `PATCH /api/v1/training/assignments/{assignmentId}`
2. Click **"Try it out"**
3. Enter the `assignmentId` from Step 12:
   - Example: `e5f6a7b8-c9d0-1234-ef56-345678901234`
4. Replace request body with:
   ```json
   {
     "status": "IN_PROGRESS",
     "progress": 50,
     "completedAt": null
   }
   ```
5. Click **"Execute"**
6. **Expected Response (200 OK):**
   ```json
   {
     "assignmentId": "e5f6a7b8-c9d0-1234-ef56-345678901234",
     "courseId": "d4e5f6a7-b8c9-0123-def4-234567890123",
     "courseTitle": "Workplace Safety Training",
     "assigneeType": "USER",
     "assigneeId": 1,
     "status": "IN_PROGRESS",
     "progress": 50,
     "completedAt": null,
     "assignedBy": 1,
     "createdAt": "2025-12-03T12:20:00Z",
     "updatedAt": "2025-12-03T12:25:00Z"
   }
   ```

**To Mark as Completed:**
```json
{
  "status": "COMPLETED",
  "progress": 100,
  "completedAt": "2025-12-03T12:30:00Z"
}
```

**Status Values:**
- `ASSIGNED` - Just assigned
- `IN_PROGRESS` - User is working on it
- `COMPLETED` - Finished
- `OVERDUE` - Past due date
- `CANCELLED` - Cancelled

**Progress:** 0-100 (percentage)

---

## Step 14: Send Training Notifications

### `POST /api/v1/notify/staff`

1. Find `POST /api/v1/notify/staff`
2. Click **"Try it out"**
3. Replace request body with one of these options:

   **Option A: Notify specific user**
   ```json
   {
     "userId": 1,
     "teamId": null,
     "overdueOnly": false,
     "incompleteOnly": true
   }
   ```

   **Option B: Notify overdue assignments only**
   ```json
   {
     "userId": null,
     "teamId": null,
     "overdueOnly": true,
     "incompleteOnly": false
   }
   ```

   **Option C: Notify specific assignments**
   ```json
   {
     "assignmentIds": [
       "e5f6a7b8-c9d0-1234-ef56-345678901234"
     ],
     "userId": null,
     "teamId": null,
     "overdueOnly": false,
     "incompleteOnly": false
   }
   ```

4. Click **"Execute"**
5. **Expected Response (202 Accepted):**
   ```json
   {
     "queued": 5,
     "message": "Notifications queued for processing"
   }
   ```

**Purpose:** Queue email/Teams notifications for training reminders

**Note:** Notifications are processed asynchronously. Check Hangfire dashboard at `http://localhost:5167/jobs` to see job status.

---

## Complete Testing Workflow

### Workflow 1: Full KPI Lifecycle

1. ✅ Create KPI: `POST /api/v1/perf/kpis`
2. ✅ Create Target: `POST /api/v1/perf/targets` (use kpiId from step 1)
3. ✅ Import Actuals: `POST /api/v1/perf/actuals/import` (upload CSV)
4. ✅ Check Import: `GET /api/v1/imports/{jobId}` (use jobId from step 3)
5. ✅ View Metrics: `GET /api/v1/perf/metrics`
6. ✅ View Time Series: `GET /api/v1/perf/metrics/timeseries`

### Workflow 2: Full Training Lifecycle

1. ✅ Get Courses: `GET /api/v1/training/courses`
2. ✅ Assign Training: `POST /api/v1/training/assign` (use courseId from step 1)
3. ✅ Update Progress: `PATCH /api/v1/training/assignments/{id}` (use assignmentId from step 2)
4. ✅ Send Notifications: `POST /api/v1/notify/staff`

---

## Common Issues & Solutions

### Issue 1: "401 Unauthorized"
**Solution:**
- Make sure you clicked "Authorize" in Swagger
- Check that token starts with `Bearer ` (with space)
- Token might be expired - get a new one

### Issue 2: "404 Not Found" for KPI
**Solution:**
- Create the KPI first using `POST /api/v1/perf/kpis`
- Use the correct `kpiId` (UUID format)

### Issue 3: "404 Not Found" for Course
**Solution:**
- Create a course first (via admin web or SQL)
- Use the correct `courseId` (UUID format)

### Issue 4: Empty arrays in responses
**Solution:**
- For KPIs: Create KPIs first, then import actuals
- For Courses: Create courses first (via admin web or SQL)
- For Metrics: Import KPI actuals data first

### Issue 5: Import job stays "QUEUED"
**Solution:**
- Check Hangfire dashboard: `http://localhost:5167/jobs`
- Verify Hangfire worker is running
- Check backend console logs for errors

### Issue 6: "Unable to determine user ID from token"
**Solution:**
- Make sure your user exists in `app_users` table
- Check that `cognito_sub` in `app_users` matches your JWT token's `sub` claim
- Verify user is active: `is_active = TRUE`

---

## Quick Reference: All Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/healthz` | Health check | No |
| POST | `/api/v1/perf/kpis` | Create KPI | Yes |
| GET | `/api/v1/perf/kpis` | List KPIs | Yes |
| GET | `/api/v1/perf/kpis/{id}` | Get KPI | Yes |
| GET | `/api/v1/perf/metrics` | KPI snapshot | Yes |
| GET | `/api/v1/perf/metrics/timeseries` | KPI time-series | Yes |
| POST | `/api/v1/perf/targets` | Create target | Yes |
| POST | `/api/v1/perf/actuals/import` | Import CSV | Yes |
| GET | `/api/v1/imports/{jobId}` | Check import | Yes |
| GET | `/api/v1/training/courses` | List courses | Yes |
| POST | `/api/v1/training/assign` | Assign training | Yes |
| PATCH | `/api/v1/training/assignments/{id}` | Update assignment | Yes |
| POST | `/api/v1/notify/staff` | Send notifications | Yes |

---

## Sample Data for Testing

### Create Sample KPI (SQL)
```sql
INSERT INTO kpis (kpi_id, code, name, description, unit, category, is_active)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'SALES_TARGET',
  'Sales Target',
  'Monthly sales target',
  'USD',
  'Sales',
  true
);
```

### Create Sample Course (SQL)
```sql
INSERT INTO training_courses (course_id, title, description, modality, is_active)
VALUES (
  'd4e5f6a7-b8c9-0123-def4-234567890123',
  'Workplace Safety Training',
  'Comprehensive safety training course',
  'ONLINE',
  true
);
```

---

## Testing Order Recommendation

1. **Health Check** → Verify backend is running
2. **Create KPI** → Set up your first KPI
3. **List KPIs** → Verify it was created
4. **Create Target** → Set a target for the KPI
5. **Import Actuals** → Upload CSV with actual values
6. **Check Import** → Verify import completed
7. **Get Metrics** → See snapshot of performance
8. **Get Time Series** → See historical trends
9. **Get Courses** → List available training
10. **Assign Training** → Assign a course to a user
11. **Update Assignment** → Update progress
12. **Send Notifications** → Queue reminders

---

## Tips

- **Save your IDs**: Keep track of `kpiId`, `courseId`, `assignmentId`, `jobId` as you create them
- **Use Swagger's "Try it out"**: It's the easiest way to test
- **Check responses**: Look at the response body to see what data was created
- **Test incrementally**: Create data first, then query it
- **Use valid user IDs**: Make sure user IDs exist in your `app_users` table

Happy Testing! 🚀

