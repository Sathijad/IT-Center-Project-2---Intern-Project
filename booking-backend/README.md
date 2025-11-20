# Booking Backend - Phase 3

Serverless booking API for IT Center staff room and resource booking system.

## Overview

This service provides APIs for:
- Room search and availability checking
- Booking creation/cancellation with conflict detection
- Blackout window management (ADMIN)
- MS Graph calendar sync
- ICS export
- Utilization reports

## Architecture

- **Runtime**: Node.js 18.x on AWS Lambda
- **Framework**: Serverless Framework
- **Database**: PostgreSQL (shared `itcenter_auth` database)
- **Auth**: AWS Cognito JWT via API Gateway authorizer
- **Infrastructure**: API Gateway HTTP API → Lambda → RDS Proxy → PostgreSQL

## Setup

### Prerequisites

- Node.js 18.x
- AWS CLI configured
- Serverless Framework installed: `npm install -g serverless`
- Access to AWS RDS, Cognito, Secrets Manager, SQS

### Installation

```bash
npm install
```

### Configuration

1. Update `config/env.dev.yml` with:
   - Database connection details
   - Cognito User Pool ID and Client ID
   - MS Graph credentials
   - VPC subnet IDs and security group IDs
   - Allowed origins for CORS

2. Store secrets in AWS Secrets Manager:
   ```bash
   aws secrets-manager create-secret \
     --name itcenter/dev/db \
     --secret-string '{"host":"...","username":"...","password":"...","dbname":"itcenter_auth"}'
   ```

### Database Migration

Before deploying, run migrations:

```bash
psql -h <db-host> -U <db-user> -d itcenter_auth -f migrations/20250120_phase3_booking.sql
psql -h <db-host> -U <db-user> -d itcenter_auth -f migrations/seed/rooms_seed.sql
```

## Development

```bash
# Run tests
npm test

# Lint
npm run lint

# Build
npm run build
```

## Deployment

```bash
# Deploy to DEV
npm run deploy:dev

# Deploy to STG
npm run deploy:stg

# Deploy to PRD
npm run deploy:prd
```

## API Endpoints

See `docs/openapi/booking.yaml` for complete API documentation.

### Key Endpoints

- `GET /api/v1/rooms` - List/search rooms
- `GET /api/v1/rooms/{id}/availability` - Get availability timeline
- `POST /api/v1/bookings` - Create booking (with Idempotency-Key header)
- `GET /api/v1/bookings` - List bookings
- `DELETE /api/v1/bookings/{id}` - Cancel booking
- `POST /api/v1/blackouts` - Create blackout (ADMIN)
- `GET /api/v1/exports/bookings.ics` - Export ICS file

## Features

- **Conflict Detection**: Uses SELECT FOR UPDATE locks to prevent race conditions
- **Idempotency**: Supports Idempotency-Key header for safe retries
- **Capacity Validation**: Checks attendee count against room capacity
- **Blackout Enforcement**: Prevents bookings during blackout windows
- **MS Graph Sync**: Two-way calendar sync with Outlook
- **ICS Export**: Generates valid iCal files

## Testing

```bash
# Unit tests
npm test

# Performance tests (k6)
k6 run tests/perf/booking-k6.js --env API_BASE_URL=<url> --env AUTH_TOKEN=<token>

# Postman collection
newman run tests/postman/booking.postman_collection.json
```

## Monitoring

- CloudWatch Logs: `/aws/lambda/booking-api-{stage}-*`
- CloudWatch Alarms: Error rate, latency, DLQ depth
- X-Ray Tracing: Enabled for Lambda and API Gateway

## Troubleshooting

See `docs/booking-runbook.md` for detailed troubleshooting guide.

## License

Internal use only.

