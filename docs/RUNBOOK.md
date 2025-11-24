# IT Center Auth - Runbook

## Quick Start (Local Development)

### Prerequisites
- Java 21 JDK
- Flutter 3.35.6 / Dart 3.9.2
- Docker Desktop
- Node.js 18+
- PostgreSQL 16

### Step 1: Environment Setup

```powershell
# Set Java 21 as default (Windows)
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# Verify versions
java -version  # Should show Java 21
flutter --version  # Should show Flutter 3.35.6
node --version  # Should show Node 18+
```

### Step 2: Start Infrastructure

```powershell
# Start PostgreSQL and MailHog
docker compose -f infra/docker-compose.yml up -d

# Verify containers are running
docker ps
```

### Step 3: Start Backend

```powershell
cd auth-backend
./mvnw spring-boot:run

# Backend should be running on http://localhost:8080
# Verify: http://localhost:8080/healthz
```

### Step 4: Start Admin Web

```powershell
# In a new terminal
cd admin-web
npm install
npm run dev

# Admin portal should be running on http://localhost:5173
```

### Step 5: Start Mobile App

```powershell
# In a new terminal
cd mobile-app
flutter pub get
flutter run

# App will launch on emulator/device
```

## API Endpoints

### Authentication Required: All endpoints except `/healthz`

### Public Endpoints
- `GET /healthz` - Health check
- `GET /actuator/health` - Actuator health

### User Profile (Authenticated)
- `GET /api/v1/me` - Get current user profile
- `PATCH /api/v1/me` - Update profile

### Admin Endpoints (ADMIN role required)
- `GET /api/v1/admin/users` - List users
- `GET /api/v1/admin/users/{id}` - Get user details
- `PATCH /api/v1/admin/users/{id}/roles` - Update user roles
- `GET /api/v1/admin/audit-log` - View audit log

## Configuration Files

### Backend
- `auth-backend/src/main/resources/application.yml` - Main config
- `auth-backend/src/main/resources/application-dev.yml` - Dev overrides

### Frontend
- `admin-web/.env` - Environment variables (create this)
- `admin-web/src/config/env.ts` - Config constants

### Mobile
- `mobile-app/android/app/src/main/AndroidManifest.xml` - Android config
- `mobile-app/ios/Runner/Info.plist` - iOS config (if applicable)

## Troubleshooting

### Backend Issues

**Problem**: `Error: java: invalid source release: 25`  
**Solution**: Set JAVA_HOME to Java 21
```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
```

**Problem**: Database connection refused  
**Solution**: Start Docker containers
```powershell
docker compose -f infra/docker-compose.yml up -d
```

**Problem**: Port 8080 already in use  
**Solution**: Change port in application.yml or kill process
```powershell
Get-Process | Where-Object {$_.Name -eq "java"}
Stop-Process -Id <PID>
```

### Frontend Issues

**Problem**: CORS errors  
**Solution**: Verify `CORS_ALLOWED_ORIGINS` in backend config

**Problem**: 401 Unauthorized  
**Solution**: Check Cognito token is valid and not expired

### Mobile Issues

**Problem**: Cannot connect to backend  
**Solution**: Use `http://10.0.2.2:8080` for Android emulator

**Problem**: Build fails  
**Solution**: Run `flutter clean && flutter pub get`

## AWS Cognito Setup

### Configure Callback URLs

Add these to Cognito User Pool:
- Web: `http://localhost:5173/auth/callback`
- Mobile: `myapp://auth/callback`

### Required Cognito Settings

```
User Pool: ap-southeast-2_hTAYJId8y
Client ID: 3rdnl5ind8guti89jrbob85r4i
Domain: itcenter-auth.auth.ap-southeast-2.amazoncognito.com
Region: ap-southeast-2
```

## Security Checklist

- ✅ JWT validation enabled
- ✅ Role-based access control enforced
- ✅ CORS configured properly
- ✅ Audit logging active
- ✅ Secure token storage (mobile)
- ✅ HTTPS only in production
- ✅ SQL injection prevention (JPA)
- ✅ XSS protection (CSP headers)

## Monitoring

### Application Logs

**Backend**: `logs/auth-api.log`
**Frontend**: Browser console
**Mobile**: Logcat (`adb logcat`)

### Health Checks

- Backend: `GET /healthz`
- Database: `docker exec itcenter_pg pg_isready`
- MailHog: `http://localhost:8025`

## Deployment

### Environment Variables (Production)

```bash
# Backend
SPRING_DATASOURCE_URL=jdbc:postgresql://prod-db:5432/itcenter_auth
COGNITO_ISSUER_URI=<prod-cognito-uri>
CORS_ALLOWED_ORIGINS=https://admin.itcenter.com
BOOTSTRAP_ADMIN_EMAIL=admin@itcenter.com

# Frontend
VITE_API_BASE_URL=https://api.itcenter.com
```

### Build Commands

```bash
# Backend
cd auth-backend
./mvnw clean package -DskipTests

# Frontend
cd admin-web
npm run build

# Mobile
cd mobile-app
flutter build apk --release  # Android
flutter build ios --release   # iOS
```

## Phase 4 Addendum — Schedules & Tasks

- **Service:** `schedules-backend/src/Schedules.Api` (ASP.NET Core 8). Deploy as container with access to the same AWS RDS PostgreSQL instance used by earlier phases.
- **Config:** Supply `ConnectionStrings:SchedulesDb` + Cognito authority/audience, feature flags, Microsoft Graph credentials, Teams webhook, and OTLP endpoint (`Telemetry:OtlpEndpoint`).
- **Migrations:** Run `dotnet ef database update` (migration `Phase4Initial`) from `schedules-backend`. Database role must have `CREATE TABLE` + `ALTER` permissions.
- **Background Jobs:** Hangfire server embedded in API; dashboard at `/jobs`. Recurring job `daily-reminders` schedule controlled via `Jobs:ReminderSchedule`.
- **Feature Flags:** Toggle `enable_ms_graph_sync`, `enable_task_notifications`, `enable_bulk_import` through configuration or AWS Secrets Manager for staged rollout.
- **Integrations:** Microsoft Graph scopes `Calendars.ReadWrite`, `User.Read`, `offline_access`. Teams notifications use webhook defined in config; ensure outbound HTTPS is allowed.
- **Health & Monitoring:** New `/healthz` endpoint plus OpenTelemetry traces (export to Grafana/Tempo). Alerts: API p95 > 500 ms, Hangfire job failure ratio > 5%, mobile task API failure > 1%.
- **Rollback:** Disable feature flags, pause Hangfire jobs, revert DB via backups (no destructive migrations). Redeploy last stable container if new API errors spike.

## Support Contacts

- Backend Issues: backend-team@itcenter.com
- Frontend Issues: frontend-team@itcenter.com
- Mobile Issues: mobile-team@itcenter.com
- Infrastructure: devops@itcenter.com

