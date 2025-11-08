# Phase 2 Serverless Runbook

This runbook captures the end-to-end workflow for deploying, operating, and maintaining the Phase 2 (leave & attendance) serverless stack on AWS.

---

## 1. Prerequisites

- **AWS Accounts / Roles**
  - Deployment credentials with permission to manage Lambda, API Gateway (HTTP), SQS, Secrets Manager, CloudWatch Logs/Alarms, and RDS/RDS Proxy.
  - Runtime credentials for Lambda execution roles (created automatically by Serverless Framework).

- **Local Tooling**
  - Node.js 18.x, npm 10.x.
  - Serverless Framework v3.x (`npm install -g serverless`).
  - AWS CLI v2 configured with the appropriate profiles.

- **Source Code Layout**
  - `leave-attendance-backend/` (TypeScript Lambda functions + Serverless Framework).
  - Shared docs/scripts in `/docs`, `/tests`, `/scripts`.

---

## 2. Network & Database Preparation

1. **Identify VPC Artefacts**
   - Private subnets with outbound routing via NAT for Lambda connectivity.
   - Security group permitting egress to RDS/RDS Proxy (typically port 5432).

2. **RDS Proxy (Recommended)**
   - Create (or reuse) an Aurora/RDS PostgreSQL proxy targeting the `itcenter_auth` database.
   - Allow the Lambda execution role security group.
   - Capture the `DB_PROXY_ENDPOINT` for environment configuration.

3. **Secrets Manager**
   - Create a secret `itcenter/{stage}/db` (JSON) with keys: `host`, `port`, `username`, `password`, `dbname` = `itcenter_auth`.
   - Record the secret ARN (`DB_SECRET_ARN`).

4. **Microsoft Graph Credentials**
   - Provision Azure AD application (client ID/secret) with `Calendars.ReadWrite`.
   - Store secret in AWS Secrets Manager or SSM; reference via env (`GRAPH_CLIENT_SECRET`).

5. **Cognito**
   - Ensure Phase 1 User Pool details available: region, user pool ID, app client ID.

---

## 3. Environment Configuration

Update the stage-specific config files under `leave-attendance-backend/config/`:

```yaml
# Example: config/env.dev.yml
allowedOrigins:
  - https://dev-admin.example.com
  - http://localhost:5173

vpc:
  subnetIds: [subnet-aaaaaaaa, subnet-bbbbbbbb]
  securityGroupIds: [sg-cccccccc]

dbSecretArn: arn:aws:secretsmanager:ap-southeast-2:123456789012:secret:itcenter/dev/db
dbProxyEndpoint: itcenter-dev-proxy.proxy-abcdefghijklmnop.ap-southeast-2.rds.amazonaws.com

cognito:
  region: ap-southeast-2
  userPoolId: ap-southeast-2_devPool
  clientId: devClientIdPlaceholder

graph:
  tenant: your-tenant-id
  clientId: graph-client-id
  clientSecret: graph-client-secret
  scope: https://graph.microsoft.com/.default

featureFlags:
  geoValidationEnabled: false
  calendarSyncEnabled: true

calendarSync:
  visibilityTimeout: 60
  maxReceiveCount: 3

provisionedConcurrency:
  clockIn: 1
  clockOut: 1
```

**Environment variables exported to Lambda**

```
DB_SECRET_ARN, DB_PROXY_ENDPOINT, DB_POOL_MAX
COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID
GEO_VALIDATION_ENABLED, CALENDAR_SYNC_ENABLED
GRAPH_TENANT, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_SCOPE
CALENDAR_SYNC_QUEUE_URL (auto-populated), ALLOWED_ORIGINS
```

---

## 4. Build & Deploy Pipeline

### 4.1 Local Build

```bash
cd leave-attendance-backend
npm install
npm run build
```

Outputs TypeScript to `dist/`.

### 4.2 Serverless Deploy

```bash
# Dev
serverless deploy --stage dev

# Staging
serverless deploy --stage stg

# Production
serverless deploy --stage prd
```

**Key CloudFormation resources**
- One Lambda per endpoint + SQS worker.
- HTTP API (API Gateway).
- SQS queue + DLQ (calendar sync).
- CloudWatch alarms (error rate, latency, DLQ depth).

### 4.3 CI/CD Workflow (reference)

1. Install dependencies (`npm ci`).
2. Lint (`npm run lint`) & unit tests (`npm test`).
3. Build (`npm run build`).
4. Package & deploy via `serverless deploy --stage <stage>`.
5. Run smoke tests (Postman/Newman) against `{{invoke_url}}`.
6. Run k6 load test (DEV/STG).
7. Promote to next environment upon pass.

---

## 5. Database Migration Process

The migration script `migrations/20251108_phase2_tables.sql` is idempotent.

1. **Backup**
   - `pg_dump -Fc --dbname=itcenter_auth --file=pre-phase2.backup`

2. **Apply migration**
   ```bash
   psql postgresql://<user>:<password>@<host>:<port>/itcenter_auth \
     -f migrations/20251108_phase2_tables.sql
   ```

3. **Verify**
   - Confirm tables exist (`\dt leave_*`, `\dt attendance_logs`).
   - Ensure FKs to `app_users`.
   - Seeded policies exist (`SELECT * FROM leave_policies;`).

4. **Rollback (if required)**
   - Restore from backup:
     `pg_restore --clean --dbname=itcenter_auth pre-phase2.backup`

---

## 6. Post-Deploy Validation

1. **Health**
   - `GET {{invoke_url}}/healthz`

2. **Authentication & RBAC**
   - Call any protected endpoint with Cognito-issued JWT.
   - Verify ADMIN vs EMPLOYEE permissions (e.g. listing other users).

3. **Leave Flows**
   - Create leave request → status `PENDING`.
   - Approve as ADMIN → balance decreases, request moves to `APPROVED`.
   - Attempt overlapping request → expect `409 LEAVE_OVERLAP`.

4. **Attendance**
   - `POST /clock-in` → create log, no duplicates.
   - `POST /clock-out` → duration calculated, log closed.

5. **Integrations**
   - Admin post to `/integrations/msgraph/sync`.
   - Confirm SQS message + worker log success.

6. **Reports**
   - Admin access `/reports/leave-summary`.

---

## 7. Alarms & Monitoring

| Alarm | Metric | Threshold | Action |
|-------|--------|-----------|--------|
| API Error Rate | API Gateway 5XXError Sum (5m) | ≥ 5 | Investigate Lambda, DB health |
| API Latency | API Gateway Latency Avg (5m) | ≥ 300 ms | Review cold starts, DB performance |
| Calendar Sync DLQ | SQS DLQ visible messages | ≥ 1 | Replay after fixing Graph token/config |

**Tracing**: X-Ray enabled via `serverless-plugin-tracing`.

**Structured logs**: JSON logs include `requestId`, `userId`, `functionName`.

---

## 8. Rollback Strategy

1. **Application rollback**
   - `serverless rollback --stage <stage>`
   - Optionally `serverless deploy --stage <stage> --timestamp <previous>` to re-deploy known good revision.

2. **Database rollback**
   - Restore latest snapshot (see §5).

3. **Post-rollback validation**
   - Re-run smoke tests + health checks.

---

## 9. Useful Endpoints

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/healthz` | GET | Unauthenticated |
| `/api/v1/leave/balance` | GET | Optional `user_id`, `year` |
| `/api/v1/leave/requests` | GET/POST | Pagination, filters, create |
| `/api/v1/leave/requests/{id}` | PATCH | Approve/Reject/Cancel |
| `/api/v1/attendance` | GET | Pagination | 
| `/api/v1/attendance/clock-in` | POST | Idempotency via header recommended |
| `/api/v1/attendance/clock-out` | POST | |
| `/api/v1/integrations/msgraph/sync` | POST | ADMIN only |
| `/api/v1/reports/leave-summary` | GET | ADMIN only |

---

## 10. Troubleshooting Quick Reference

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| `DB_SECRET_ARN not set` error | Missing env variable | Verify stage config & re-deploy |
| `UNAUTHORIZED` on all endpoints | Missing/expired Cognito JWT | Re-authenticate |
| `LEAVE_OVERLAP` on create | Existing approved/pending leave | Adjust dates or cancel prior leave |
| Calendar sync DLQ growth | Graph token/permission failure | Regenerate secret, check Azure scope |
| Latency > 300ms | Cold starts or DB saturation | Check provisioned concurrency & RDS Proxy |

---

## 11. Artefacts Produced

- `docs/openapi/leave-attendance.yaml` – OpenAPI spec.
- `leave-attendance-backend/tests/postman/leave-attendance.postman_collection.json` – Postman collection.
- `leave-attendance-backend/tests/performance/attendance-load-test.js` – k6 load script.
- `leave-attendance-backend/migrations/20251108_phase2_tables.sql` – Postgres migration.

These artefacts feed the CI/CD pipeline, regression tests, and onboarding documentation.

