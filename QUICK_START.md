# Quick Start Guide - Phase 2

## 🚀 One-Command Startup

```powershell
.\start-phase2.ps1
```

This will start:
- ✅ PostgreSQL database
- ✅ Phase 1 Auth Backend (port 8080)
- ✅ Phase 2 Leave/Attendance Backend (port 3000)
- ✅ React Admin Portal (port 5173)

---

## 📋 Manual Startup Commands

### 1. Start Database
```powershell
docker compose -f infra/docker-compose.yml up -d
```

### 2. Run Migrations
```powershell
cd auth-backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
.\mvnw.cmd flyway:migrate
cd ..
```

### 3. Start Phase 1 Auth Backend
```powershell
cd auth-backend
.\start.ps1
```

### 4. Start Phase 2 Leave/Attendance Backend
```powershell
cd leave-attendance-backend
npm install
npm start
```

### 5. Start React Admin Portal
```powershell
cd admin-web
npm install
npm run dev
```

---

## ⚙️ Configuration Required

### 1. Create `.env` file in `leave-attendance-backend/`
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

### 2. Update React Admin Portal API URL

**Option A**: Update `admin-web/src/config/env.ts`
```typescript
API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
```

**Option B**: Create `admin-web/.env`
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## ✅ Verify Services

```powershell
# Check Phase 1 Auth Backend
curl http://localhost:8080/healthz

# Check Phase 2 Leave/Attendance Backend
curl http://localhost:3000/healthz

# Open Admin Portal
start http://localhost:5173
```

---

## 📝 Notes

- **Phase 1 Backend** (port 8080): Handles authentication only
- **Phase 2 Backend** (port 3000): Handles leave & attendance APIs
- **React Portal** (port 5173): Needs to point to Phase 2 backend for leave/attendance features
- **Database**: Shared PostgreSQL database (Phase 1 & 2)

---

See `PHASE2_SETUP_GUIDE.md` for detailed configuration.

