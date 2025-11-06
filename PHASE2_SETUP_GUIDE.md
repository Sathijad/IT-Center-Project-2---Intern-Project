# Phase 2 Setup Guide

## Quick Start Commands

### Option 1: Automated Startup (Recommended)
```powershell
.\start-phase2.ps1
```

### Option 2: Manual Startup

#### 1. Start Infrastructure
```powershell
docker compose -f infra/docker-compose.yml up -d
```

#### 2. Run Database Migrations
```powershell
cd auth-backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
.\mvnw.cmd flyway:migrate
cd ..
```

#### 3. Start Phase 1 Auth Backend (Spring Boot)
```powershell
cd auth-backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
.\start.ps1
# Runs on http://localhost:8080
```

#### 4. Start Phase 2 Leave/Attendance Backend (Node.js)

**Option A: Using Express directly (Development)**
```powershell
cd leave-attendance-backend
npm install
# Create .env file (see below)
npm start
# Runs on http://localhost:3000
```

**Option B: Using SAM CLI (Lambda Local)**
```powershell
cd leave-attendance-backend
sam local start-api --port 3000
```

#### 5. Start React Admin Portal
```powershell
cd admin-web
npm install
npm run dev
# Runs on http://localhost:5173
```

#### 6. (Optional) Start Mobile App
```powershell
cd mobile-app
flutter pub get
flutter run
```

---

## Configuration Requirements

### 1. Database Migrations
**Status**: ✅ Already included in `auth-backend/src/main/resources/db/migration/V3__phase2_leave_attendance.sql`

**Action Required**: Run migrations once
```powershell
cd auth-backend
.\mvnw.cmd flyway:migrate
```

### 2. Phase 2 Backend Environment Variables

**File**: `leave-attendance-backend/.env` (create this file)

```env
DATABASE_URL=postgresql://itcenter:password@localhost:5432/itcenter_auth
COGNITO_ISSUER_URI=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y
CORS_ORIGINS=http://localhost:5173
GEO_VALIDATION_ENABLED=true
OFFICE_LATITUDE=-37.8136
OFFICE_LONGITUDE=144.9631
GEOFENCE_RADIUS_METERS=1000
NODE_ENV=development
```

**Action Required**: Create `.env` file in `leave-attendance-backend/` directory

### 3. React Admin Portal API Configuration

**File**: `admin-web/src/config/env.ts`

**Current**:
```typescript
API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
```

**Action Required**: 
- Update to point to Phase 2 backend OR
- Set environment variable: `VITE_API_BASE_URL=http://localhost:3000`

**Option 1**: Update `env.ts`:
```typescript
API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
```

**Option 2**: Create `.env` file in `admin-web/`:
```env
VITE_API_BASE_URL=http://localhost:3000
```

### 4. AWS Cognito Configuration
**Status**: ✅ Already configured (using existing Phase 1 credentials)

**Values** (no changes needed):
- User Pool ID: `ap-southeast-2_hTAYJId8y`
- Client ID: `3rdnl5ind8guti89jrbob85r4i`
- Domain: `itcenter-auth.auth.ap-southeast-2.amazoncognito.com`

### 5. Office Location for Geofencing (Optional)
**File**: `leave-attendance-backend/.env`

**Action Required**: Update coordinates if your office location differs:
```env
OFFICE_LATITUDE=-37.8136    # Your office latitude
OFFICE_LONGITUDE=144.9631   # Your office longitude
GEOFENCE_RADIUS_METERS=1000 # Allowed radius in meters
```

### 6. Microsoft Graph Calendar Sync (Optional - for Production)
**Status**: ⚠️ Requires Microsoft Graph API credentials

**Action Required** (for production only):
- Register app in Azure AD
- Get Tenant ID, Client ID, Client Secret
- Store in AWS Secrets Manager or environment variables:
  - `MSGRAPH_TENANT_ID`
  - `MSGRAPH_CLIENT_ID`
  - `MSGRAPH_CLIENT_SECRET`

---

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 5432 | localhost:5432 |
| Phase 1 Auth Backend | 8080 | http://localhost:8080 |
| Phase 2 Leave/Attend Backend | 3000 | http://localhost:3000 |
| React Admin Portal | 5173 | http://localhost:5173 |

---

## Health Checks

After starting services, verify they're running:

```powershell
# Phase 1 Auth Backend
curl http://localhost:8080/healthz

# Phase 2 Leave/Attendance Backend
curl http://localhost:3000/healthz

# Admin Portal
# Open browser: http://localhost:5173
```

---

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `docker ps`
- Check connection string matches Docker Compose settings

### Backend Not Starting
- Verify Node.js 20.x is installed: `node --version`
- Check `.env` file exists in `leave-attendance-backend/`
- Verify database migrations ran successfully

### Frontend API Errors
- Check `VITE_API_BASE_URL` points to correct backend (port 3000 for Phase 2)
- Verify both backends are running (Phase 1 for auth, Phase 2 for leave/attendance)

---

## Next Steps

1. ✅ Run database migrations
2. ✅ Create `.env` file for Phase 2 backend
3. ✅ Update React admin portal API URL
4. ✅ Start all services
5. ✅ Test login and navigation
6. ✅ Test leave request creation
7. ✅ Test clock in/out (mobile app)

