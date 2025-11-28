# Phase 5 — Events & Announcements

## 1. Goals & KPIs
- Deliver internal announcements with creation, moderation, scheduling, and broadcast to push/email/Teams.
- Success metrics: feed p95 < 300 ms, broadcast success > 98%, error rate < 1%, cache hit ratio > 50%.

## 2. Roles
| Role | Capabilities |
| --- | --- |
| ADMIN | Create/edit/schedule events, moderate, broadcast, manage tags, view audit trail. |
| EMPLOYEE | View feed (web/mobile), open details, receive push/email/Teams notifications, RSVP (future). |

## 3. Frontend Surfaces
- **Admin Web (React)**: Event list, create/edit form, scheduling controls, moderation dashboard, broadcast audit viewer, tag suggestion panel. Must include empty/loading/error states, React Query caching, Tailwind tokens, WCAG 2.1 AA, keyboard navigation.
- **Mobile (Flutter)**: Event feed with infinite scroll + shimmer, detail view, push notifications, optional RSVP. Integrates with Amplify auth and caches feed via ETag.

## 4. API Design
- `GET /api/v1/events?channel=&since=&page=&size=` (ETag aware, pagination, filters)
- `GET /api/v1/events/{event_id}`
- `POST /api/v1/events`
- `PATCH /api/v1/events/{event_id}`
- `POST /api/v1/events/{event_id}/moderate`
- `POST /api/v1/events/{event_id}/broadcast` (requires `Idempotency-Key`)
- `POST /api/v1/events/tag-suggest`
- `GET /api/v1/tags?query=`
- `GET /healthz`
- Error envelope `{ code, message, requestId }`

## 5. Backend Architecture
- Go 1.22 (Gin/Fiber), pgx for SQL, PostgreSQL shared DB (`itcenter_auth`), Cognito JWT auth, RBAC.
- Business rules: moderation required before broadcast, HTML sanitization, body stored in `announcement_bodies`, tags normalized + tracked, audit logs for broadcast.
- Feature flags: `events.push_enabled`, `events.email_enabled`, `events.teams_enabled`.
- Background workers (SQS/SNS) for broadcast fan-out, tag suggestions, scheduled publish. Retries with DLQ.

## 6. Data Model & Migration
Tables: `events`, `announcement_bodies`, `event_tags`, `tag_library`, `publish_audit`, `feature_flags`. Use idempotent SQL script with `CREATE TABLE IF NOT EXISTS`, indexes, triggers, default data, referencing `app_users(id)`.

## 7. Integrations
- Push: FCM/APNs (via existing mobile infra).
- Email: AWS SES.
- Teams: Microsoft Graph API / webhook.
- Queueing: AWS SQS/SNS fan-out workers. Secrets stored in AWS Secrets Manager / SSM.

## 8. Security & Compliance
- Sanitize HTML, encode output in admin UI, enforce server-side RBAC (JWT scopes + DB roles).
- Correlation IDs per log entry, keep PII safe, Secrets via AWS services, run OWASP ZAP (no High/Critical).

## 9. Observability
- Structured logs capturing `correlation_id`, `user_id`, `event_id`, `broadcast_job_id`.
- Metrics: request throughput, p95 latency, notification success/failure, queue depth, worker failures.
- Tracing spans: `feed_list`, `event_detail`, `broadcast_fanout`. Dashboards for feed latency & broadcast stats.

## 10. Testing & Evidence
- **Unit:** Go + Testify, ≥70% coverage on services/repos.
- **API:** Postman/Newman suites covering CRUD/moderation/broadcast/tag endpoints.
- **UI Automation:** Selenium (React) & Appium (Flutter feed).
- **Performance:** k6 scenarios for feed p95 < 300 ms, worker throughput.
- **Accessibility:** axe (React), Lighthouse ≥85.
- **Security:** OWASP ZAP report (no High/Critical).
- Attach artefacts (test outputs, k6 graphs, Lighthouse, ZAP, screenshots) to release.

## 11. CI/CD
- Pipeline: build → unit tests → lint → SAST/SCA → Postman → deploy DEV → verify STG → canary PRD.
- Required checks: OpenAPI updated, migrations included, tests green, coverage threshold met, ZAP clean.
- Deployment: canary release, run migrations first, fallback via feature flags.

## 12. Documents & Runbooks
- Update `docs/ERD.md`, `docs/openapi/events.yaml`, `docs/RUNBOOK.md`, release notes.
- Provide wireframes/screenshots for admin + mobile feed.
- Runbook entries cover env vars, worker ops, rollback steps.

## 13. Definition of Ready
- Wireframes available, OpenAPI draft done, migrations drafted, feature flags defined, UAT scenarios listed.

## 14. Definition of Done
- All endpoints + workers + UI surfaces implemented.
- Tests/perf/a11y/security evidence attached.
- Logs/metrics/traces instrumented.
- Feature deployed through DEV → STG → PRD, monitored with no regressions.

