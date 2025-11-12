# Leave & Attendance Serverless Backend

Per-endpoint AWS Lambda functions (Node.js 18) providing leave, attendance, reporting, and MS Graph integration APIs for Phase 2.

## Architecture Snapshot

- **Runtime**: Node.js 18.x (TypeScript → `dist/`)
- **Framework**: Serverless Framework v3
- **API Layer**: API Gateway (HTTP API)
- **Database**: PostgreSQL (`itcenter_auth`) via Secrets Manager + optional RDS Proxy
- **Authentication**: AWS Cognito JWT with RBAC (ADMIN / EMPLOYEE)
- **Integrations**: SQS worker for Microsoft Graph calendar sync
- **Monitoring**: CloudWatch logs/alarms, X-Ray tracing enabled

## Local Development

### Prerequisites

- Node.js 18.x
- npm 10.x
- Serverless CLI (`npm install -g serverless`)

### Install & Build

```bash
cd leave-attendance-backend
npm install
npm run build
```

### Unit Tests & Linting

```bash
# Jest unit tests with coverage
npm test

# ESLint
npm run lint
```

### Environment Configuration

Runtime configuration is provided via YAML files in `config/` per stage. See `docs/PHASE2_SERVERLESS_RUNBOOK.md` §3 for the full list of required values:

```yaml
allowedOrigins:
  - https://dev-admin.example.com

vpc:
  subnetIds: [subnet-aaaaaaaa, subnet-bbbbbbbb]
  securityGroupIds: [sg-cccccccc]

database:
  host: itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com
  port: 5432
  user: postgres
  password: password
  name: itcenter-auth
  ssl: true
  poolMax: 10
```

## Deployment

The Serverless Framework template (`serverless.yml`) provisions all Lambda functions, API Gateway routes, SQS queues, and alarms.

```bash
# Deploy to a stage (dev/stg/prd)
serverless deploy --stage dev

# Roll back
serverless rollback --stage dev
```

Refer to `.github/workflows/serverless-phase2.yml` for the CI/CD pipeline and to `docs/PHASE2_SERVERLESS_RUNBOOK.md` for step-by-step AWS setup.

## Testing & Validation

- **Unit tests**: `npm test`
- **Postman**: `tests/postman/leave-attendance.postman_collection.json` (supply `invoke_url` & `access_token` variables)
- **Performance**: `tests/performance/attendance-load-test.js` (k6 100 rps, p95 < 300 ms)
- **Security**: ZAP baseline scan in CI

## API Catalogue

Full contract lives at `docs/openapi/leave-attendance.yaml`.

Key endpoints:

- `GET /api/v1/leave/balance`
- `GET /api/v1/leave/requests`
- `POST /api/v1/leave/requests`
- `PATCH /api/v1/leave/requests/{id}`
- `GET /api/v1/attendance`
- `POST /api/v1/attendance/clock-in`
- `POST /api/v1/attendance/clock-out`
- `POST /api/v1/integrations/msgraph/sync`
- `GET /api/v1/reports/leave-summary`
- `GET /healthz`

## Project Structure

```
src/
  common/           # auth, db pool, responses, validation
  handlers/         # Lambda handlers per endpoint
  repositories/     # Data access for leave/attendance/reporting
  services/         # Business logic
  utils/            # Shared utilities (date calc, geo)
  index.ts          # Placeholder entrypoint (for bundlers)

migrations/         # Idempotent SQL migrations
tests/              # Postman, k6 assets
.github/workflows/  # CI/CD pipeline
```

## References

- [Serverless Runbook](../docs/PHASE2_SERVERLESS_RUNBOOK.md)
- [OpenAPI Spec](../docs/openapi/leave-attendance.yaml)
- [Postman Collection](tests/postman/leave-attendance.postman_collection.json)
- [k6 Performance Script](tests/performance/attendance-load-test.js)
