# Phase 4 Runbook — Schedules & Tasks Module

## Overview

- **Service**: `schedules-backend/Schedules.Api` (ASP.NET Core 9, EF Core, Hangfire)
- **Database**: AWS RDS PostgreSQL (shared cluster)
- **Background Jobs**: Hangfire (Calendar sync, Teams reminders, CSV imports)
- **Integrations**: Microsoft Graph (Calendars.ReadWrite), Microsoft Teams webhook
- **Authentication**: AWS Cognito JWT (ADMIN, TL, EMP roles)

## Deployments

1. Build + test:
   ```powershell
   cd schedules-backend
   dotnet build
   dotnet test
   ```
2. Publish container image (`Dockerfile` TBD) or `dotnet publish`.
3. Run EF migrations:
   ```powershell
   cd schedules-backend/Schedules.Api
   dotnet ef database update
   ```
4. Deploy API + Hangfire worker (separate process) to ECS/EC2.
5. Validate `/healthz`, `/swagger`, Hangfire dashboard, and MS Graph sync job metrics.

## Configuration

| Setting | Source | Notes |
| --- | --- | --- |
| `ConnectionStrings__MainDatabase` | Secrets Manager | RDS endpoint |
| `Jwt__Authority` / `Audience` | App config | Cognito tenant |
| `MsGraph__*` | Secrets Manager | Azure AD confidential client |
| `Teams__WebhookUrl` | Secrets Manager | Teams channel |
| `FeatureFlags__*` | AWS AppConfig or env vars | Toggle modules safely |

## Feature Flags

- `enable_ms_graph_sync`
- `enable_task_notifications`
- `enable_bulk_import`
- `enable_mobile_task_comments`

Update via AppConfig or env vars; service polls on startup and via options monitor.

## Background Jobs

| Job | Schedule | Description |
| --- | --- | --- |
| `calendar-sync` | Hourly | Push upcoming schedules (next 7 days) to MS Graph |
| `task-reminders` | Daily | Send Teams reminders for tasks due within 24h |
| `CsvImportWorker` | On-demand | Processes schedule CSV import jobs |

Monitor via `/hangfire` dashboard or Hangfire metrics (Prometheus/OTel).

## Observability

- **Health**: `/healthz` (includes Postgres check)
- **Telemetry**: OpenTelemetry OTLP exporter (configure `OTEL_EXPORTER_OTLP_ENDPOINT`)
- **Logs**: Structured JSON with `request_id`, `user_id`, `correlation_id`
- **Metrics**: API latency, schedules created, tasks completed/day, Hangfire success rate
- **Alerts**:
  - `api_p95 > 300ms` sustained 5m
  - Hangfire failure rate >5%
  - Graph sync throttling > 10 failures/hour

## Operational Tasks

- **CSV Import Failures**: Check `import_jobs` table + Hangfire console logs; re-run job if error resolved.
- **Schedule Conflicts**: API returns `SCHEDULE_CONFLICT`; instruct admins to adjust time range.
- **MS Graph Throttling**: Feature flag `enable_ms_graph_sync` can be toggled to mitigate; job uses exponential backoff.
- **Teams Notifications**: Verify webhook secret; disable via flag if channel unavailable.

## Rollback

1. Disable feature flags for new functionality to minimize impact.
2. Redeploy previous Docker image / build artifact.
3. Apply EF migration rollback if schema change caused outage:
   ```powershell
   dotnet ef database update <PreviousMigration>
   ```
4. Re-enable features gradually (canary 10% → 100%).

## Testing & Evidence

- `dotnet test` (unit tests with Moq + InMemory DB)
- Postman regression suite (Schedules/Tasks collection)
- k6 load test (500 VUs target p95 < 350 ms)
- Selenium + Appium UI automation for React/Flutter flows
- Accessibility scans (axe, Lighthouse)
- ZAP DAST baseline for API + admin web

## Support Contacts

- **Backend Owner**: Phase 4 Squad (contact via Teams `#it-center-phase4`)
- **On-call Escalation**: IT Center Ops hotline + PagerDuty rotation `itcenter-core`

Document updates live in `docs/PHASE4_RUNBOOK.md`. Keep this runbook in sync with deployments.

