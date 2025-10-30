# OWASP ZAP Baseline Scan

This project includes OWASP ZAP baseline scans for the React admin (Vite at 5173) and Spring Boot API (8080).

## Targets
- WEB: `http://host.docker.internal:5173`
- API: `http://host.docker.internal:8080`

## Files
- Compose: `infra/docker-compose.security.yml`
- Hook: `security/hook.py` (suppresses dev-only endpoints/alerts)
- Ignore: `security/.zap-ignore` (ignores common localhost dev issues)
- Reports: `security-reports/`
- CI Workflow: `.github/workflows/zap-scan.yml`

## Local prerequisites
- Docker Desktop running
- Backend running on `8080`
- Frontend running on `5173`

### Start services locally
```powershell
# Backend
cd "auth-backend"
./mvnw -q -DskipTests spring-boot:run
```
```powershell
# Frontend
cd "admin-web"
npm ci
npm run dev -- --host --port 5173
```

### Run ZAP scans
From the repository root:
```powershell
cd "infra"
docker compose -f docker-compose.security.yml up --abort-on-container-exit --exit-code-from zap-web zap zap-web zap-api
```

### Reports
- `security-reports/web-baseline.html`
- `security-reports/api-baseline.html`
(Also JSON and XML variants.)

## Baseline flags used
- `--allow-missing-content`
- `--hook=/zap/wrk/hook.py`
- `--zap-url http://zap`
- Reports to `/zap/reports/` mapped to `./security-reports/`

## Severity gates
- Fail: High or Critical
- Warn only: Medium
- Ignore: Known dev-only routes and localhost mixed content via `hook.py` and `.zap-ignore`

## CI (GitHub Actions)
Workflow `zap-scan`:
- Builds and starts backend (8080) and frontend (5173)
- Runs ZAP via `infra/docker-compose.security.yml`
- Uploads `security-reports` as artifacts
- Enforces severity gates (fail on High/Critical)

## Troubleshooting
- If ZAP finds nothing, verify services are up: `curl http://localhost:5173` and `curl http://localhost:8080`
- On Linux runners, `host.docker.internal` is mapped via `extra_hosts` in compose.


