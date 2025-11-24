<!-- Phase 4 feature flag reference -->

# Feature Flags — Phase 4 (Schedules & Tasks)

| Flag | Default | Scope | Description | Rollout Notes |
| --- | --- | --- | --- | --- |
| `enable_ms_graph_sync` | `false` | Backend API, Hangfire workers | Enables Microsoft Graph calendar sync + availability queries. | Turn on in staging after verifying app registration + throttling budgets. |
| `enable_task_notifications` | `false` | Backend API, Teams worker | Pushes task assignment + reminder cards to Microsoft Teams webhook. | Requires Teams webhook secrets and message templates in AWS Secrets Manager. |
| `enable_bulk_import` | `false` | Backend API, CSV import worker, React UI | Allows admins to upload CSV files and poll job status. | Gate feature while validating CSV templates with pilot teams. |
| `enable_mobile_task_comments` | `true` | Mobile API surface (Flutter) | Allows employees to post task comments from mobile app. | Enabled by default; can be disabled if moderation is required. |

## Implementation Notes

- Flags stored in `app_settings` table and cached via Redis; updates invalidate cache to keep p95 latency under 300 ms.
- Backend exposes `/api/v1/feature-flags` to write-protected callers (ADMIN). Mobile + React fetch read-only snapshot on login and subscribe to SSE updates.
- Hangfire workers evaluate flags before enqueuing jobs to avoid unnecessary Graph traffic when disabled.
- CI pipelines run test matrix with flags on/off to ensure behavior parity.

