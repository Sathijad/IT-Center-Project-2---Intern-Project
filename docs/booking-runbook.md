# Booking System - Deployment Runbook

## Overview

This runbook covers deployment, troubleshooting, and operational procedures for the Phase 3 Booking System.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Serverless Framework installed (`npm install -g serverless`)
- Node.js 18.x
- Access to:
  - AWS RDS (itcenter_auth database)
  - AWS Cognito User Pool (Phase 1)
  - AWS Secrets Manager
  - AWS SQS
  - Microsoft Graph API credentials

## Environment Setup

### 1. Database Migration

Before deploying the backend, run the database migrations:

```bash
cd booking-backend

# Connect to database (use RDS Proxy endpoint or direct connection)
psql -h <db-host> -U <db-user> -d itcenter_auth -f migrations/20250120_phase3_booking.sql

# Seed sample rooms (optional)
psql -h <db-host> -U <db-user> -d itcenter_auth -f migrations/seed/rooms_seed.sql
```

### 2. Configure Environment Variables

Update `booking-backend/config/env.dev.yml` (and env.stg.yml, env.prd.yml) with:

- Database connection details (or Secrets Manager ARN)
- Cognito User Pool ID and Client ID
- MS Graph credentials (tenant, clientId, clientSecret)
- VPC subnet IDs and security group IDs
- Allowed origins for CORS

### 3. Secrets Manager Setup

Store sensitive credentials in AWS Secrets Manager:

```bash
# Database secret
aws secrets-manager create-secret \
  --name itcenter/dev/db \
  --secret-string '{"host":"...","port":5432,"username":"...","password":"...","dbname":"itcenter_auth"}'

# MS Graph secret
aws secrets-manager create-secret \
  --name itcenter/dev/graph \
  --secret-string '{"tenant":"...","clientId":"...","clientSecret":"..."}'
```

Update `env.dev.yml` to reference these secrets via ARN.

## Deployment

### Backend Deployment

```bash
cd booking-backend

# Install dependencies
npm install

# Deploy to DEV
npm run deploy:dev

# Deploy to STG
npm run deploy:stg

# Deploy to PRD (requires approval)
npm run deploy:prd
```

### Frontend Deployment

The admin web frontend is deployed separately. Ensure `VITE_BOOKING_API_BASE_URL` environment variable is set to the API Gateway URL.

## Health Checks

### API Health

```bash
curl https://<api-id>.execute-api.ap-southeast-2.amazonaws.com/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T10:00:00Z",
  "service": "booking-api"
}
```

### Database Connectivity

Check Lambda logs for database connection errors. Verify:
- RDS Proxy endpoint is correct
- Security groups allow Lambda → RDS traffic
- Database credentials are valid

## Monitoring & Alarms

### CloudWatch Alarms

The following alarms are configured:

1. **API Error Rate** (`booking-api-{stage}-error-rate`)
   - Metric: 5XXError
   - Threshold: ≥ 5 errors in 5 minutes
   - Action: SNS notification

2. **API Latency** (`booking-api-{stage}-latency`)
   - Metric: Latency (average)
   - Threshold: ≥ 300ms
   - Action: SNS notification

3. **Booking Sync DLQ Depth** (`booking-api-{stage}-booking-sync-dlq-depth`)
   - Metric: ApproximateNumberOfMessagesVisible
   - Threshold: ≥ 1 message
   - Action: SNS notification (indicates sync failures)

### Key Metrics to Monitor

- **Request Rate**: API Gateway request count
- **Error Rate**: 4XX and 5XX errors
- **Latency**: p50, p95, p99 percentiles
- **SQS Queue Depth**: Booking sync queue length
- **DLQ Depth**: Dead letter queue depth
- **Database Connections**: RDS connection pool usage

## Troubleshooting

### Common Issues

#### 1. Booking Conflicts Not Detected

**Symptoms**: Multiple bookings created for same room/time slot

**Diagnosis**:
- Check Lambda logs for transaction errors
- Verify `SELECT FOR UPDATE` is being used in booking creation
- Check database isolation level (should be READ COMMITTED or higher)

**Resolution**:
- Ensure booking creation uses `withTransaction` wrapper
- Verify `checkConflicts` method uses row-level locks
- Check for race conditions in concurrent requests

#### 2. MS Graph Sync Failures

**Symptoms**: Bookings not appearing in Outlook calendars

**Diagnosis**:
- Check SQS DLQ for failed messages
- Review worker Lambda logs
- Verify MS Graph credentials are valid
- Check for throttling errors (429 status)

**Resolution**:
- Verify Graph credentials in Secrets Manager
- Check worker Lambda timeout (should be ≥ 60s)
- Review exponential backoff in sync service
- Manually trigger sync: `POST /api/v1/integrations/msgraph/sync`

#### 3. Idempotency Not Working

**Symptoms**: Duplicate bookings created with same Idempotency-Key

**Diagnosis**:
- Check database unique constraint on `idempotency_key`
- Verify header is being read correctly
- Check TTL/expiration logic

**Resolution**:
- Verify unique index exists: `idx_bookings_idempotency_key`
- Check handler reads `Idempotency-Key` header
- Ensure idempotency check happens before booking creation

#### 4. Blackout Windows Not Enforced

**Symptoms**: Bookings created during blackout periods

**Diagnosis**:
- Check blackout repository queries
- Verify booking service checks blackouts
- Review timezone handling

**Resolution**:
- Ensure `checkOverlap` is called in booking service
- Verify blackout times are in UTC
- Check booking times are compared correctly

#### 5. High Latency

**Symptoms**: API responses > 300ms

**Diagnosis**:
- Check database query performance
- Review Lambda cold starts
- Check RDS Proxy connection pool

**Resolution**:
- Add database indexes if missing
- Enable provisioned concurrency for high-traffic endpoints
- Increase RDS Proxy connection pool size
- Review slow query logs

### Log Analysis

#### View Lambda Logs

```bash
# Recent logs
aws logs tail /aws/lambda/booking-api-dev-bookingsCreate --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/booking-api-dev-bookingsCreate \
  --filter-pattern "ERROR"
```

#### Database Query Logs

Enable query logging in RDS and review slow queries:

```sql
-- Enable slow query log
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
```

## Rollback Procedures

### Backend Rollback

```bash
cd booking-backend

# Remove deployment
serverless remove --stage dev

# Redeploy previous version
# (Restore from backup or redeploy from previous commit)
```

### Database Rollback

**WARNING**: Only rollback if absolutely necessary. Phase 3 tables should not affect Phase 1/2.

```sql
-- Rollback migration (use with caution)
BEGIN;

-- Drop Phase 3 tables (only if no data to preserve)
DROP TABLE IF EXISTS booking_audit CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS blackout_windows CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

COMMIT;
```

## Feature Flags

Control feature availability via environment variables:

- `CALENDAR_SYNC_ENABLED`: Enable/disable MS Graph sync (default: false)
- `ICS_EXPORT_ENABLED`: Enable/disable ICS export (default: true)
- `PUSH_ENABLED`: Enable/disable push notifications (default: false)

Update in `config/env.{stage}.yml` and redeploy.

## Performance Tuning

### Database Optimization

1. **Indexes**: Ensure all indexes from migration are created
2. **Connection Pooling**: Adjust `DB_POOL_MAX` based on load
3. **Query Optimization**: Review slow queries and add indexes

### Lambda Optimization

1. **Memory**: Increase memory for compute-intensive handlers (e.g., reports)
2. **Timeout**: Increase timeout for long-running operations (e.g., sync worker)
3. **Provisioned Concurrency**: Enable for high-traffic endpoints

### API Gateway

1. **Caching**: Enable caching for read-only endpoints (rooms list)
2. **Compression**: Already enabled (minimumCompressionSize: 1024)
3. **Throttling**: Configure rate limits if needed

## Security

### Secrets Management

- Never commit secrets to git
- Use AWS Secrets Manager for all sensitive data
- Rotate secrets regularly
- Use least-privilege IAM roles

### Input Validation

- All inputs validated with Zod schemas
- SQL injection prevented via parameterized queries
- XSS prevented via output encoding

### RBAC Enforcement

- Server-side role checks in all handlers
- Never trust client-side role claims
- Admin endpoints require `ADMIN` role

## Support Contacts

- **Backend Issues**: Check CloudWatch logs and alarms
- **Database Issues**: Contact DBA team
- **MS Graph Issues**: Verify credentials and check Graph API status
- **Frontend Issues**: Check browser console and network logs

## Appendix

### Useful Commands

```bash
# Check SQS queue depth
aws sqs get-queue-attributes \
  --queue-url <queue-url> \
  --attribute-names ApproximateNumberOfMessages

# Trigger manual sync
curl -X POST https://<api-url>/api/v1/integrations/msgraph/sync \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "full_sync"}'

# Export bookings as ICS
curl "https://<api-url>/api/v1/exports/bookings.ics?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer <token>" \
  -o bookings.ics
```

### Database Schema Reference

See `booking-backend/migrations/20250120_phase3_booking.sql` for complete schema.

Key tables:
- `rooms`: Room catalog
- `bookings`: User bookings
- `blackout_windows`: Unavailable periods
- `booking_audit`: Audit trail

