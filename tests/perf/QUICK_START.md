# Quick Start - k6 Performance Tests

## Prerequisites

1. Install k6: `choco install k6` (Windows) or `brew install k6` (Mac)
2. Get JWT tokens from Cognito (employee and admin)

## Quick Test (Smoke Test)

```powershell
# Windows PowerShell
cd tests/perf
.\run-tests.ps1 -TestType smoke -ApiUrl "https://your-api.execute-api.ap-southeast-2.amazonaws.com" -EmployeeToken "your-jwt-token"
```

```bash
# Linux/Mac
cd tests/perf
./run-tests.sh smoke "https://your-api.execute-api.ap-southeast-2.amazonaws.com" "your-jwt-token"
```

## Full Performance Test

```powershell
# Windows PowerShell
.\run-tests.ps1 -TestType full -ApiUrl "https://your-api.execute-api.ap-southeast-2.amazonaws.com" -EmployeeToken "employee-token" -AdminToken "admin-token"
```

```bash
# Linux/Mac
./run-tests.sh full "https://your-api.execute-api.ap-southeast-2.amazonaws.com" "employee-token" "admin-token"
```

## Direct k6 Command

```bash
# Smoke test
k6 run booking-k6-smoke.js \
  --env API_BASE_URL=https://your-api.execute-api.ap-southeast-2.amazonaws.com \
  --env AUTH_TOKEN=your-jwt-token

# Full test
k6 run booking-k6.js \
  --env API_BASE_URL=https://your-api.execute-api.ap-southeast-2.amazonaws.com \
  --env EMPLOYEE_TOKEN=employee-token \
  --env ADMIN_TOKEN=admin-token
```

## Getting JWT Tokens

1. Log in to the admin web portal
2. Open browser DevTools (F12)
3. Go to Application/Storage → Local Storage
4. Find the token (usually stored as `token` or `accessToken`)
5. Copy the token value

Or use Postman/curl to authenticate and get the token from the response.

## Expected Results

- **Smoke Test**: Should complete in ~1 minute with 5 VUs
- **Full Test**: Takes ~7 minutes with up to 100 VUs

All tests should show:
- ✓ Health check passes
- ✓ All endpoints return 200/201 status
- ✓ Error rate < 2%
- ✓ Response times within thresholds

## Troubleshooting

**401 Unauthorized**: Token expired or invalid - get a new token

**High error rate**: Check API Gateway limits, database connections, or Lambda concurrency

**Slow responses**: Review CloudWatch logs, check database performance, verify indexes

