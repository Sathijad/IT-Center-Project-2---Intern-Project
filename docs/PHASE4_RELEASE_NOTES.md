# Phase 4 Release Notes — Schedules & Task Management

## Overview
- Adds ASP.NET Core 8 backend (`schedules-backend`) with EF Core + PostgreSQL (AWS RDS) for schedules, tasks, recurrences, comments, imports, and Hangfire workers.
- Extends Admin React portal and Flutter mobile clients (placeholders for follow-up PRs) to new routes `/schedules`, `/tasks`, `/imports`, `/reports`.
- Integrates Microsoft Graph calendar sync, Teams webhook notifications, CSV imports, and availability APIs.

## Backend Changes
- **API Surface:** `/api/v1/schedules`, `/tasks`, `/imports`, `/availability`, `/integrations/msgraph/sync`, `/healthz`.
- **Auth:** Cognito JWT validation with role policies (ADMIN, EMP). Only ADMIN can create/manage schedules and tasks. EMPLOYEE can view own schedules and assigned tasks.
- **Background Jobs:** Hangfire workers for calendar sync, task notifications, CSV import processing, and daily reminders.
- **Feature Flags:** `enable_ms_graph_sync`, `enable_task_notifications`, `enable_bulk_import`.
- **Telemetry:** OpenTelemetry traces → OTLP endpoint, Grafana dashboards (API latency, job success, schedules/day, tasks/day).

## Database
- New tables: `schedules`, `tasks`, `task_notes`, `recurrences`, `import_jobs`.
- Indices for performance and conflict enforcement.
- Seeded sample data and default statuses.
- Migration: `Phase4Initial` (manual creation due to CLI restrictions). Apply via EF `dotnet ef database update` using shared RDS connection.

## Frontend / Mobile
- React: Planner board, task grid (TanStack Table + React Query), CSV import wizard, reports and availability overlays.
- Flutter: Weekly schedule view, task list/detail with comments, push notifications, offline cache.

## Integrations & Ops
- MS Graph: Calendars.ReadWrite + Teams notifications with retry/backoff.
- Hangfire dashboard at `/jobs`.
- Health endpoint `/healthz` consumed by CloudWatch alarms.
- Secrets resolved via AWS Secrets Manager + `config/shared-db.ps1`.
- Feature-flagged rollout (Graph + notifications + bulk import) for canary (10% users).

## Testing Evidence
- Backend: xUnit + Moq (80% goal), integration tests using Testcontainers (PostgreSQL), Newman API suite in `tests/postman/phase4.collection.json`.
- Frontend: Vitest, Cypress, Axe (≥90), Lighthouse (≥90), Allure reports stored under `admin-web/allure-report`.
- Mobile: Widget + golden tests, Appium automation stored under `mobile-app/tests/automation`.
- Performance: `tests/perf/phase4.js` (k6, 500 VUs, p95 < 350 ms).
- Security: CodeQL + Dependabot + ZAP (No High/Critical).

## Deployment
- CI/CD flow: build → unit tests → lint → SAST/SCA → API tests → deploy DEV/STG/PRD.
- Dockerized ASP.NET app + Hangfire worker container. EF migrations executed during deployment.
- Monitor 24h post-release; rollback plan documented in `docs/RUNBOOK.md`.

