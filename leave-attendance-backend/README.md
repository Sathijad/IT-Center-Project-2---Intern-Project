# Leave & Attendance Management Backend

Node.js/Express Lambda backend for Phase 2 - Leave and Attendance Management.

## Architecture

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Deployment**: AWS Lambda via API Gateway (SAM)
- **Database**: PostgreSQL (shared with Phase 1)
- **Authentication**: AWS Cognito JWT

## Local Development

### Prerequisites

- Node.js 20.x
- AWS SAM CLI
- Docker (for local Lambda testing)

### Setup

```bash
# Install dependencies
npm install

# Start local API (requires SAM CLI)
sam local start-api --port 3000

# Or use local Express server (for development)
node src/app.js  # Note: requires DATABASE_URL env var
```

### Environment Variables

Create `.env` file:

```env
DATABASE_URL=postgresql://itcenter:password@localhost:5432/itcenter_auth
COGNITO_ISSUER_URI=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y
CORS_ORIGINS=http://localhost:5173
GEO_VALIDATION_ENABLED=true
OFFICE_LATITUDE=-37.8136
OFFICE_LONGITUDE=144.9631
GEOFENCE_RADIUS_METERS=1000
```

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run watch mode
npm run test:watch
```

## Deployment

```bash
# Build
sam build

# Deploy to DEV
sam deploy --config-env dev

# Deploy to STG
sam deploy --config-env stg

# Deploy to PRD
sam deploy --config-env prd
```

## API Endpoints

See `docs/openapi/leave-attendance.yaml` for full API documentation.

Main endpoints:
- `GET /api/v1/leave/balance` - Get leave balances
- `GET /api/v1/leave/requests` - List leave requests
- `POST /api/v1/leave/requests` - Create leave request
- `PATCH /api/v1/leave/requests/{id}` - Update leave status
- `GET /api/v1/attendance` - Get attendance logs
- `POST /api/v1/attendance/clock-in` - Clock in
- `POST /api/v1/attendance/clock-out` - Clock out

## Project Structure

```
src/
  ├── index.js              # Lambda handler entry point
  ├── app.js                # Express app setup
  ├── config/
  │   └── database.js       # Database connection
  ├── middleware/
  │   ├── auth.js           # JWT authentication & RBAC
  │   ├── errorHandler.js   # Error handling
  │   └── requestLogger.js  # Request logging
  ├── routes/
  │   ├── health.js         # Health check
  │   ├── leave.js          # Leave endpoints
  │   ├── attendance.js     # Attendance endpoints
  │   ├── integrations.js   # Integration endpoints
  │   └── reports.js        # Report endpoints
  ├── services/
  │   ├── leaveService.js   # Leave business logic
  │   └── attendanceService.js  # Attendance business logic
  ├── repositories/
  │   ├── leaveRepository.js      # Leave data access
  │   └── attendanceRepository.js # Attendance data access
  ├── utils/
  │   ├── validation.js     # Zod schemas
  │   └── dateUtils.js      # Date utilities
  └── integrations/
      └── msgraph/
          └── handler.js    # Calendar sync Lambda
```

## See Also

- [Phase 2 Runbook](../docs/PHASE2_RUNBOOK.md)
- [Phase 2 Release Notes](../docs/PHASE2_RELEASE_NOTES.md)
- [OpenAPI Spec](../docs/openapi/leave-attendance.yaml)

