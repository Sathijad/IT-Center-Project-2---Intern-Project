# Phase 2 - Leave & Attendance Management Runbook

## Overview

This runbook covers operational procedures for the Leave & Attendance Management system (Phase 2).

## Architecture

- **Backend**: Node.js/Express Lambda functions via API Gateway
- **Database**: PostgreSQL (shared with Phase 1 auth system)
- **Frontend**: React admin portal
- **Mobile**: Flutter app
- **Integrations**: Microsoft Graph API (calendar sync), AWS SES (notifications)

## Environment Variables

### Lambda Functions

```
DATABASE_URL=postgresql://user:password@host:5432/itcenter_auth
COGNITO_ISSUER_URI=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y
CORS_ORIGINS=http://localhost:5173,https://admin.itcenter.com
GEO_VALIDATION_ENABLED=true
OFFICE_LATITUDE=-37.8136
OFFICE_LONGITUDE=144.9631
GEOFENCE_RADIUS_METERS=1000
CALENDAR_SYNC_ENABLED=true
CALENDAR_SYNC_QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/...
MSGRAPH_TENANT_ID=<tenant-id>
MSGRAPH_CLIENT_ID=<client-id>
MSGRAPH_CLIENT_SECRET=<secret> (stored in Secrets Manager)
```

## Database Migrations

### Apply Migrations

```bash
# Connect to database
psql -h <host> -U itcenter -d itcenter_auth

# Or via Flyway (Spring Boot backend)
cd auth-backend
mvn flyway:migrate
```

### Rollback Migration

If you need to rollback Phase 2 migration:

```sql
-- Run the rollback script
\i auth-backend/src/main/resources/db/migration/V3__phase2_leave_attendance_rollback.sql
```

## Deployment

### Local Development

```bash
# Start database
docker compose -f infra/docker-compose.yml up -d

# Start Lambda locally (SAM CLI)
cd leave-attendance-backend
sam local start-api --port 3000

# Start React frontend
cd admin-web
npm run dev
```

### Deploy to AWS

```bash
cd leave-attendance-backend

# Build
sam build

# Deploy to DEV
sam deploy --config-env dev

# Deploy to STG
sam deploy --config-env stg

# Deploy to PRD (with canary)
sam deploy --config-env prd
```

## Monitoring

### CloudWatch Logs

- **Main API**: `/aws/lambda/leave-attendance-{env}`
- **Calendar Sync**: `/aws/lambda/calendar-sync-{env}`

### Key Metrics

- Request rate (RPS)
- p50/p95 latency
- Error rate (target < 1%)
- Database connection pool usage

### Alarms

Set up CloudWatch alarms for:
- Error rate > 1%
- p95 latency > 300ms
- Database connection failures

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check Lambda VPC configuration
   - Verify security group rules
   - Check database credentials in Secrets Manager

2. **Calendar Sync Not Working**
   - Verify Microsoft Graph credentials
   - Check SQS queue for failed messages
   - Review calendar sync Lambda logs

3. **Geofencing Rejecting Valid Clock-ins**
   - Verify office coordinates in environment variables
   - Check geofence radius setting
   - Review GPS accuracy in attendance logs

### Health Checks

```bash
# API health
curl https://api-dev.itcenter.com/v2/healthz

# Database connectivity (from Lambda)
# Check CloudWatch logs for connection errors
```

## Backup & Recovery

### Database Backups

- Automated RDS snapshots (if using RDS)
- Manual pg_dump for critical data

### Recovery Procedures

1. Restore database from snapshot
2. Re-run migrations if needed
3. Verify API endpoints
4. Test calendar sync

## Performance Tuning

### Lambda Configuration

- Memory: 512 MB (default)
- Timeout: 30 seconds
- Provisioned concurrency for PRD (to avoid cold starts)

### Database

- Connection pool: 20 max connections
- Indexes on frequently queried columns
- Monitor slow queries

## Security

### Secrets Management

- Database credentials: AWS Secrets Manager
- Microsoft Graph credentials: AWS Secrets Manager
- Cognito configuration: Environment variables

### Access Control

- RBAC enforced at API level
- JWT validation via Cognito
- Geo validation for clock-in/out

## Support Contacts

- **DevOps**: devops@itcenter.com
- **Database Admin**: dba@itcenter.com
- **On-Call**: oncall@itcenter.com

## Change Log

- 2025-01-XX: Initial Phase 2 deployment
- 2025-XX-XX: Calendar sync enabled
- 2025-XX-XX: Geofencing improvements

