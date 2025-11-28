# Phase 5 Release Notes — Events & Announcements

## Highlights
- **Go Events API:** New `events-backend` service with endpoints for listing, creating, moderating, broadcasting, tag suggestions, and audits. Includes JWT auth, RBAC, ETag caching, and OpenAPI spec.
- **Async Workers:** Dedicated binaries for broadcast fan-out (SQS), tag heuristics, and scheduled publishing. Structured logs + retries + DLQ guidance.
- **Admin Web UI:** Event list, creation/editing with tag suggestions, moderation dashboard, broadcast audit viewer, employee feed route, Tailwind/React Query updates.
- **Mobile Feed:** Flutter home screen exposes announcements feed with caching + refresh, hitting the Go API directly.
- **Database Schema:** Added `events`, `announcement_bodies`, `event_tags`, `tag_library`, `publish_audit`, `feature_flags` with triggers and indexes.
- **Docs & Evidence:** Updated ERD, OpenAPI, runbook, requirements, release notes. Added new Postman/k6/axe placeholders for CI.

## Backward Compatibility
- Existing phases remain untouched (shared `itcenter_auth` DB). Feature flags default ON but can be toggled (`events.push_enabled`, etc.).
- Admin UI adds new routes but preserves legacy navigation. Employees gain optional `/feed` view.

## Deployment Notes
1. Apply SQL migration `events-backend/migrations/20251201_events.sql`.
2. Deploy Go API container (port 8085) with required env vars + Secrets Manager references.
3. Provision AWS SQS queue + IAM role, deploy workers.
4. Update `VITE_EVENTS_API_BASE_URL` + mobile `ApiBase.eventsBase`.
5. Gradually enable broadcast feature flags per channel; monitor p95 latency + audit success.

## Known Issues / Next Steps
- RSVP endpoint stubbed for future phase.
- Tag suggestions currently heuristic; ML integration pending data volume.
- Workers use logger-based notifier by default; replace with SES/FCM/Teams adapters when credentials available.

