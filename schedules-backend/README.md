# Schedules Backend (Phase 4)

ASP.NET Core 9 Web API that powers the Staff Schedules & Task Management module. The service exposes REST APIs, Hangfire background jobs, and integrations with Microsoft Graph and Microsoft Teams while persisting data to the shared AWS RDS PostgreSQL cluster.

## Tech Stack

- .NET 9 / ASP.NET Core Web API
- Entity Framework Core 9 + PostgreSQL
- Hangfire 1.8 for background processing
- AutoMapper + FluentValidation
- OpenTelemetry (OTLP exporter) + Serilog
- xUnit + Moq + EF InMemory for tests

## Getting Started

```powershell
cd schedules-backend/Schedules.Api

# Restore + database migrations (local Postgres)
dotnet ef database update

# Run API
dotnet run
```

### Environment Variables

| Variable | Description |
| --- | --- |
| `ConnectionStrings__MainDatabase` | PostgreSQL connection string (defaults to local dev) |
| `Jwt__Authority` | OIDC authority (Cognito) |
| `Jwt__Audience` | API audience/client ID |
| `MsGraph__TenantId` / `ClientId` / `ClientSecret` | Azure AD app registration |
| `Teams__WebhookUrl` | Teams incoming webhook |
| `FeatureFlags__*` | Toggle Graph sync, notifications, bulk import, mobile comments |

### Database

Migrations live under `Schedules.Api/Data/Migrations`. Use `dotnet ef migrations add <Name>` plus `dotnet ef database update` to evolve schema. The initial `Phase4Initial` migration provisions:

- `schedules`, `recurrences`, `tasks`, `task_notes`, `import_jobs`
- Indexes for user/team schedules, task status, import status
- JSONB columns for metadata and attachments

### Background Jobs

Hangfire is configured with PostgreSQL storage. Recurring jobs:

- `calendar-sync`: pushes upcoming schedules to MS Graph hourly.
- `task-reminders`: sends Teams reminders for tasks due within 24h.

Use `/hangfire` dashboard (AUTH TBD) to monitor jobs locally.

### Testing

```powershell
cd schedules-backend
dotnet test
```

Coverage targets 80%+ for service layer (xUnit + Moq). Integration & performance testing are tracked separately (k6, Postman, Selenium/Appium).

### Observability

OpenTelemetry tracing + metrics emit via OTLP exporters (configure `OTEL_EXPORTER_OTLP_ENDPOINT`). Logs flow through ASP.NET logging / Serilog; correlation IDs populate `request_id` and `user_id` in structured logs.

### Feature Flags

Flags live in configuration / AWS AppConfig:

- `enable_ms_graph_sync`
- `enable_task_notifications`
- `enable_bulk_import`
- `enable_mobile_task_comments`

`FeatureFlagService` surfaces their current values to controllers, services, and Hangfire workers.

