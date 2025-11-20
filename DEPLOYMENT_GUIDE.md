# Phase 3 Booking System - Deployment Guide

This guide will walk you through deploying and running the Phase 3 booking system.

## Prerequisites

- Node.js 18.x or higher
- AWS CLI configured with appropriate credentials
- PostgreSQL database access (shared `itcenter_auth` database)
- AWS account with access to:
  - Lambda
  - API Gateway
  - RDS/PostgreSQL
  - Cognito
  - Secrets Manager
  - SQS
  - CloudWatch
  - VPC (if using VPC)

## Step 1: Database Setup

### 1.1 Run Database Migrations

**Option A: Using Node.js Script (Recommended - No psql needed)**

```bash
cd booking-backend

# Install dependencies (if not done)
npm install

# Create .env file with database credentials
# Copy .env.example and update with your values:
# DB_HOST=your-rds-endpoint.rds.amazonaws.com
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=your-password
# DB_NAME=itcenter_auth
# DB_SSL=true

# Run migration (includes seed data)
npm run migrate
```

**Option B: Using psql (if you have PostgreSQL client installed)**

```bash
# Using psql
psql -h <your-db-host> -U <your-db-user> -d itcenter_auth -f booking-backend/migrations/20250120_phase3_booking.sql

# Seed initial room data
psql -h <your-db-host> -U <your-db-user> -d itcenter_auth -f booking-backend/migrations/seed/rooms_seed.sql
```

**Option C: Using Database GUI Tool (pgAdmin, DBeaver, etc.)**

1. Open your database GUI tool
2. Connect to your PostgreSQL database
3. Open the SQL file: `booking-backend/migrations/20250120_phase3_booking.sql`
4. Execute the SQL
5. Then execute: `booking-backend/migrations/seed/rooms_seed.sql`

**Option D: Using AWS RDS Query Editor**

1. Go to AWS Console → RDS → Your database
2. Click "Query Editor"
3. Copy and paste the contents of `20250120_phase3_booking.sql`
4. Execute
5. Then do the same for `rooms_seed.sql`

### 1.2 Verify Tables Created

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rooms', 'bookings', 'blackout_windows', 'booking_audit');

-- Check rooms data
SELECT id, name, capacity, location FROM rooms LIMIT 5;
```

## Step 2: Backend Deployment

**Important:** This deploys to AWS just like Phase 2! It will create:
- ✅ Lambda functions (one for each API endpoint)
- ✅ API Gateway HTTP API
- ✅ SQS queues (for MS Graph sync)
- ✅ CloudWatch alarms
- ✅ IAM roles and permissions

### 2.1 Install Dependencies

```bash
cd booking-backend
npm install
```

### 2.2 Configure Environment

Edit `config/env.dev.yml` with your actual values:

```yaml
database:
  host: your-rds-endpoint.rds.amazonaws.com
  port: 5432
  user: your-db-user
  password: your-db-password  # Or use Secrets Manager
  name: itcenter_auth
  ssl: true
  poolMax: 10

cognito:
  region: ap-southeast-2
  userPoolId: ap-southeast-2_hTAYJId8y  # Same as Phase 2
  clientId: 3rdnl5ind8guti89jrbob85r4i   # Same as Phase 2

graph:
  tenant: your-tenant-id.onmicrosoft.com
  clientId: your-azure-app-client-id
  clientSecret: your-azure-app-secret
  scope: https://graph.microsoft.com/.default

vpc:
  subnetIds:
    - subnet-xxxxxxxxx  # Same as Phase 2
    - subnet-yyyyyyyyy
  securityGroupIds:
    - sg-xxxxxxxxx      # Same as Phase 2

allowedOrigins:
  - http://localhost:5173
  - https://your-admin-web-domain.com

featureFlags:
  calendarSyncEnabled: true
  icsExportEnabled: true
  pushEnabled: false

bookingSync:
  visibilityTimeout: 60
  maxReceiveCount: 3
```

**Note:** You can reuse the same Cognito and VPC settings from Phase 2!

### 2.3 Store Secrets in AWS Secrets Manager (Recommended)

```bash
# Create database secret
aws secrets-manager create-secret \
  --name itcenter/dev/db \
  --secret-string '{"host":"your-host","username":"your-user","password":"your-password","dbname":"itcenter_auth","port":5432}' \
  --region ap-southeast-2

# Create MS Graph secret
aws secrets-manager create-secret \
  --name itcenter/dev/msgraph \
  --secret-string '{"tenant":"your-tenant","clientId":"your-client-id","clientSecret":"your-secret"}' \
  --region ap-southeast-2
```

Then update `env.dev.yml` to reference secrets instead of plain text.

### 2.4 Deploy Backend to AWS

```bash
# Deploy to DEV
npm run deploy:dev

# This will:
# 1. Build your TypeScript code
# 2. Package Lambda functions
# 3. Create/update API Gateway
# 4. Create/update Lambda functions
# 5. Create SQS queues
# 6. Set up CloudWatch alarms
# 7. Configure IAM roles
```

**What gets created in AWS:**
- Lambda functions: `booking-api-dev-listRooms`, `booking-api-dev-createBooking`, etc.
- API Gateway: HTTP API with all your endpoints
- SQS: `booking-api-dev-booking-sync` queue
- CloudWatch: Alarms for errors, latency, DLQ depth

### 2.5 Get API Gateway URL

After deployment, note the API Gateway URL from the output:

```
Service Information
service: booking-api
stage: dev
region: ap-southeast-2
...
endpoints:
  GET - https://xxxxxxxxxx.execute-api.ap-southeast-2.amazonaws.com/healthz
  GET - https://xxxxxxxxxx.execute-api.ap-southeast-2.amazonaws.com/api/v1/rooms
  ...
```

**Save this URL** - you'll need it for frontend configuration.

### 2.6 Test Backend Health

```bash
# Test health endpoint
curl https://your-api-id.execute-api.ap-southeast-2.amazonaws.com/healthz

# Should return: {"status":"ok","timestamp":"...","service":"booking-api"}
```

## Step 3: Frontend (Admin Web) Setup

### 3.1 Install Dependencies

```bash
cd admin-web
npm install
```

### 3.2 Configure Environment Variables

Create or update `.env` or `.env.local`:

```bash
# Phase 1 API (Auth)
VITE_API_BASE_URL=http://localhost:8080
# Or production: https://your-auth-api.com

# Phase 2 API (Leave/Attendance)
VITE_LEAVE_API_BASE_URL=https://xfub6mzcqg.execute-api.ap-southeast-2.amazonaws.com
# Or local: http://localhost:3000

# Phase 3 API (Booking) - Use the URL from Step 2.5
VITE_BOOKING_API_BASE_URL=https://your-booking-api-id.execute-api.ap-southeast-2.amazonaws.com

# For local development
VITE_USE_LOCAL_PHASE2=false
VITE_USE_LOCAL_PHASE3=false

# Cognito (should already be configured)
VITE_COGNITO_USER_POOL_ID=ap-southeast-2_hTAYJId8y
VITE_COGNITO_CLIENT_ID=3rdnl5ind8guti89jrbob85r4i
```

### 3.3 Update Config File

Edit `src/config/env.ts` if needed to match your environment variables.

### 3.4 Run Development Server

```bash
npm run dev
```

The admin web should be available at `http://localhost:5173`

### 3.5 Test Frontend

1. Open `http://localhost:5173`
2. Login with your Cognito credentials
3. Navigate to:
   - `/booking/book` - Employee booking page
   - `/booking/my-bookings` - Your bookings
   - `/admin/booking/rooms` - Admin room management (ADMIN only)
   - `/admin/booking/blackouts` - Admin blackout management (ADMIN only)
   - `/admin/booking/all` - All bookings view (ADMIN only)

## Step 4: Mobile App Setup

### 4.1 Install Dependencies

```bash
cd mobile-app
flutter pub get
```

### 4.2 Configure API Base URLs

The mobile app uses environment variables or defaults. You can:

**Option A: Use environment variables when running**

```bash
# For Android
flutter run --dart-define=BOOKING_API_BASE=https://your-api-id.execute-api.ap-southeast-2.amazonaws.com

# For iOS
flutter run --dart-define=BOOKING_API_BASE=https://your-api-id.execute-api.ap-southeast-2.amazonaws.com
```

**Option B: Update default in code**

Edit `lib/src/booking_api_base.dart`:

```dart
// Replace placeholder with your actual API Gateway URL
return 'https://your-actual-api-id.execute-api.ap-southeast-2.amazonaws.com';
```

### 4.3 Run Mobile App

```bash
# Android
flutter run

# iOS
flutter run

# Web
flutter run -d chrome
```

### 4.4 Test Mobile App

1. Login with Cognito credentials
2. Navigate to "Book Room" from home screen
3. Search for rooms and create a booking
4. View "My Bookings" to see your bookings

## Step 5: MS Graph Integration (Optional)

### 5.1 Configure Azure App Registration

1. Go to Azure Portal → App Registrations
2. Create or use existing app registration
3. Note:
   - Tenant ID
   - Client ID
   - Client Secret (create one)
4. Grant permissions:
   - `Calendars.ReadWrite` (Application permission)
   - `User.Read.All` (if needed)

### 5.2 Update Backend Config

Update `config/env.dev.yml` with MS Graph credentials (already done in Step 2.2).

### 5.3 Configure Room Calendar IDs

For each room that should sync with Outlook:

```sql
UPDATE rooms 
SET external_calendar_id = 'room-calendar@yourdomain.com'
WHERE id = 1;
```

### 5.4 Test Calendar Sync

1. Create a booking via API or frontend
2. Check SQS queue for sync messages
3. Verify event appears in Outlook calendar

## Step 6: Testing

### 6.1 Test API Endpoints

```bash
# Get auth token (from Cognito)
TOKEN="your-jwt-token"

# List rooms
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api-id.execute-api.ap-southeast-2.amazonaws.com/api/v1/rooms

# Create booking
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-123" \
  -d '{
    "room_id": 1,
    "start_ts": "2025-01-25T10:00:00Z",
    "end_ts": "2025-01-25T11:00:00Z",
    "title": "Test Meeting"
  }' \
  https://your-api-id.execute-api.ap-southeast-2.amazonaws.com/api/v1/bookings
```

### 6.2 Run Tests

```bash
# Backend unit tests
cd booking-backend
npm test

# Performance tests (k6)
k6 run tests/perf/booking-k6.js \
  --env API_BASE_URL=https://your-api-id.execute-api.ap-southeast-2.amazonaws.com \
  --env AUTH_TOKEN=your-token
```

## Step 7: Monitoring

### 7.1 CloudWatch Logs

View Lambda logs:
```bash
aws logs tail /aws/lambda/booking-api-dev-listRooms --follow
```

### 7.2 CloudWatch Alarms

Check alarms in AWS Console:
- Error rate alarm
- Latency alarm
- DLQ depth alarm

### 7.3 X-Ray Tracing

Enable X-Ray in AWS Console to view traces.

## Troubleshooting

### Backend Issues

**Lambda timeout:**
- Increase timeout in `serverless.yml`
- Check database connection pool size

**Database connection errors:**
- Verify VPC configuration
- Check security group rules
- Verify RDS Proxy (if using)

**Cognito auth errors:**
- Verify user pool ID and client ID
- Check token expiration
- Verify CORS settings

### Frontend Issues

**CORS errors:**
- Update `allowedOrigins` in `env.dev.yml`
- Redeploy backend

**API 401 errors:**
- Check Cognito token
- Verify token in Authorization header
- Check token expiration

**API 403 errors:**
- Verify user has correct role (ADMIN vs EMPLOYEE)
- Check route protection in frontend

### Mobile App Issues

**Network errors:**
- Verify API base URL
- Check Android emulator uses `10.0.2.2` for localhost
- Verify CORS allows mobile app origin

## Quick Start Checklist

- [ ] Database migrations run (using Node.js script or GUI)
- [ ] Room seed data loaded
- [ ] Backend dependencies installed
- [ ] `config/env.dev.yml` configured
- [ ] Backend deployed to AWS (creates Lambda + API Gateway)
- [ ] API Gateway URL saved
- [ ] Frontend `.env` configured
- [ ] Frontend running on localhost:5173
- [ ] Mobile app API base URL configured
- [ ] Test booking created successfully
- [ ] CloudWatch logs accessible

## Next Steps

1. **Production Deployment:**
   - Create `env.prd.yml` with production values
   - Deploy: `npm run deploy:prd`
   - Update frontend production build

2. **CI/CD Setup:**
   - Configure GitHub Actions or similar
   - Automate deployments
   - Add automated tests

3. **Monitoring:**
   - Set up CloudWatch dashboards
   - Configure alerting
   - Set up log aggregation

4. **Documentation:**
   - Update API documentation
   - Create user guides
   - Document admin procedures

## Support

For issues, check:
- `docs/booking-runbook.md` - Operational runbook
- `docs/openapi/booking.yaml` - API specification
- CloudWatch logs for errors
- X-Ray traces for performance issues
