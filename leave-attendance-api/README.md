# Leave & Attendance API - Phase 2

Node.js backend for Staff Leave & Attendance Management.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Server runs on `http://localhost:8082`

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `PORT=8082` - Server port
- `DB_HOST=localhost` - PostgreSQL host
- `DB_NAME=itcenter_auth` - Database name (shared with Phase 1)
- `COGNITO_ISSUER` - Cognito JWT issuer URI
- `COGNITO_USER_POOL_ID` - Cognito User Pool ID

## API Endpoints

### Leave
- `GET /api/v1/leave/balance` - Get leave balance
- `GET /api/v1/leave/requests` - List leave requests
- `POST /api/v1/leave/requests` - Create leave request
- `PATCH /api/v1/leave/requests/:id` - Approve/reject leave request (Admin only)
- `PATCH /api/v1/leave/requests/:id/cancel` - Cancel leave request

### Attendance
- `POST /api/v1/attendance/clock-in` - Clock in
- `POST /api/v1/attendance/clock-out` - Clock out
- `GET /api/v1/attendance/today` - Get today's attendance status
- `GET /api/v1/attendance` - List attendance logs

### Reports (Admin only)
- `GET /api/v1/reports/leave-summary` - Leave summary report

### Health
- `GET /healthz` - Health check
- `GET /readyz` - Readiness check (includes DB)

## Database

Uses the same PostgreSQL database as Phase 1 (`itcenter_auth`).

Migrations are managed by Flyway in the Java backend (`auth-backend`):
- `V8__leave_attendance.sql` - Creates Phase 2 tables
- `V9__seed_leave_policies.sql` - Seeds default leave policies

## Authentication

All endpoints require Cognito JWT token in `Authorization: Bearer <token>` header.

Roles:
- **ADMIN**: Full access to all endpoints
- **EMPLOYEE**: Can only access own data

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run API tests
npm run test:api
```

## Project Structure

```
src/
├── app.ts                 # Express app
├── server.ts              # Server entry point
├── routes/                # Route definitions
├── controllers/           # Request handlers
├── services/              # Business logic
├── repositories/          # Database access
├── middleware/            # Auth, RBAC, error handling
└── lib/                   # Utilities (db, cognito, errors)
```

