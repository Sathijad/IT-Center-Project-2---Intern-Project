# Phase 4 – Schedules & Task Management Requirements

## Overview
- **Objective:** Deliver centralized scheduling, task assignments, reminders, and calendar sync for staff.
- **Platform Stack:** ASP.NET Core 8 Web API, PostgreSQL (AWS RDS), Hangfire workers, React admin UI, Flutter mobile app.
- **Integrations:** Microsoft Graph (Calendars + Teams notifications), AWS Secrets Manager for credentials, existing Cognito JWT auth.
- **Non-goals:** Payroll, Gantt project management, external time tracking, KPIs reporting beyond scope above.

## Roles & Access
| Role      | Capabilities |
|-----------|--------------|
| Employee  | View own schedules/tasks, add task comments, receive reminders. |
| Team Lead | Manage team schedules, assign tasks, review availability and workload. |
| Admin     | Full CRUD, CSV imports, reports, feature-flag toggles, background job monitoring. |

## Functional Scope
1. **Schedules:** Weekly planner CRUD, no overlapping entries per user, recurrence support, MS Graph sync and free/busy overlays.
2. **Tasks:** Create/update tasks with priority, due date, status workflow (Pending, In-Progress, Done), threaded comments with audit trail, Teams notifications.
3. **Imports:** CSV upload for bulk schedule creation with validation, status polling, and idempotent retries.
4. **Availability:** `/api/v1/availability` bridging internal schedules with Graph free/busy.
5. **Background Jobs:** Hangfire workers for calendar sync, Teams notifications, CSV processing, and daily reminders guarded by feature flags.
6. **Reporting:** Task load, schedule gaps, and import job KPIs exposed in admin React dashboards and Grafana metrics.

## Non-Functional Requirements
- **Performance:** API p95 < 300 ms (perf tests at 500 VUs); job success > 99%; mobile API failure < 1%.
- **Security:** JWT + RBAC, FluentValidation on all inputs, encrypted PII at rest, audit logs for schedule/task/comment changes, OWASP ZAP clean (no High/Critical).
- **Accessibility:** WCAG 2.1 AA, keyboard navigation, focus traps, aria labels on new screens.
- **Observability:** Correlation IDs, OpenTelemetry tracing, metrics for API latency, schedules created, tasks completed/day, job success, Grafana dashboards with alerts (p95 > 500 ms, job failure > 5%).

## Feature Flags
- `enable_ms_graph_sync`
- `enable_task_notifications`
- `enable_bulk_import`

## Dependencies & Assumptions
- MS Graph app registration with scopes `Calendars.ReadWrite`, `User.Read`, `offline_access`.
- Existing `app_users` data model for staff metadata.
- RDS PostgreSQL shared via `config/shared-db.ps1` secrets.
- Network connectivity to Graph and Teams webhooks.

## Definition of Ready
- Wireframes per React/Flutter screens (empty/loading/error/success/pagination/filter states).
- OpenAPI draft stored at `docs/openapi/phase4.yaml`.
- ERD updates reviewed and approved.
- Test plan drafted with unit/API/UI/perf/a11y coverage expectations.

## Definition of Done
- APIs, DB migrations, background jobs, and frontends delivered with 80%+ unit test coverage.
- Accessibility and performance reports ≥ targets; CI pipeline green including SAST/SCA/ZAP.
- Feature flags validated; artifacts produced (OpenAPI, ERD, migrations, runbook addendum, release notes).
- Deployed to production, monitored for 24h with no alert regressions.

