# Phase 7 k6 Performance Testing Guide

## Overview

This directory contains k6 performance tests for Phase 7 Feedback & Issue Reporting API. The tests cover all endpoints with different load scenarios.

## Prerequisites

1. **Install k6**: https://k6.io/docs/getting-started/installation/
   ```powershell
   # Windows (using Chocolatey)
   choco install k6
   
   # Or download from https://github.com/grafana/k6/releases
   ```

2. **Get JWT Tokens**:
   - Employee token: Login as an employee user and get the JWT token
   - Admin token: Login as an admin user and get the JWT token

3. **Start Feedback Backend**:
   ```powershell
   cd feedback-backend
   php artisan serve --port=8086
   ```

## Test Scripts

### 1. Smoke Test (`phase7-smoke.js`)
- **Purpose**: Verify the system works with minimal load
- **Load**: 1 virtual user for 30 seconds
- **Use Case**: Quick verification after deployment

**Run:**
```powershell
k6 run --env API_BASE_URL=http://localhost:8086 --env EMPLOYEE_TOKEN=your_token phase7-smoke.js
```

### 2. Load Test (`phase7-load.js`)
- **Purpose**: Test system under normal expected load
- **Load**: Ramp up to 50 VUs, maintain for 3 minutes
- **Use Case**: Validate performance under typical usage

**Run:**
```powershell
k6 run --env API_BASE_URL=http://localhost:8086 --env EMPLOYEE_TOKEN=your_token phase7-load.js
```

### 3. Stress Test (`phase7-stress.js`)
- **Purpose**: Push system to its limits
- **Load**: Ramp up to 300 VUs
- **Use Case**: Find breaking points and system limits

**Run:**
```powershell
k6 run --env API_BASE_URL=http://localhost:8086 --env EMPLOYEE_TOKEN=your_token phase7-stress.js
```

### 4. Full Performance Test (`phase7-feedback.js`)
- **Purpose**: Comprehensive performance test with all scenarios
- **Load**: Ramp up to 100 VUs with mixed employee/admin flows
- **Use Case**: Complete performance validation

**Run:**
```powershell
k6 run --env API_BASE_URL=http://localhost:8086 --env EMPLOYEE_TOKEN=emp_token --env ADMIN_TOKEN=admin_token phase7-feedback.js
```

## Test Scenarios

### Employee Flow (70% of traffic)
1. List own feedback
2. Create new feedback
3. Get feedback details
4. Add message to feedback

### Admin Flow (25% of traffic)
1. List all feedback
2. Get feedback details
3. Update feedback (status, priority)
4. Queue sentiment analysis
5. Export CSV

### Health Check (5% of traffic)
1. Public health check endpoint

## Performance Thresholds

### Smoke Test
- P95 response time: < 1000ms
- Error rate: < 1%

### Load Test
- P95 response time: < 500ms
- P99 response time: < 1000ms
- Error rate: < 1%

### Stress Test
- P95 response time: < 2000ms
- Error rate: < 5%

### Full Test
- P95 response time: < 500ms
- P99 response time: < 1000ms
- Error rate: < 2%
- Custom metrics:
  - Feedback create: < 600ms (P95)
  - Feedback list: < 400ms (P95)
  - Feedback detail: < 300ms (P95)
  - Message add: < 400ms (P95)

## Running Tests

### Quick Start

1. **Set environment variables:**
   ```powershell
   $env:API_BASE_URL="http://localhost:8086"
   $env:EMPLOYEE_TOKEN="your_employee_jwt_token"
   $env:ADMIN_TOKEN="your_admin_jwt_token"
   ```

2. **Run smoke test:**
   ```powershell
   cd tests/perf
   k6 run phase7-smoke.js
   ```

3. **Run full test:**
   ```powershell
   k6 run phase7-feedback.js
   ```

### With Custom Configuration

```powershell
k6 run --env API_BASE_URL=http://localhost:8086 --env EMPLOYEE_TOKEN=token --env ADMIN_TOKEN=token phase7-feedback.js
```

### Generate Results File

Results are automatically saved to:
- `phase7-feedback-perf-results.json` (for full test)
- Console output with summary

### View Results

```powershell
# Run test and save results
k6 run --out json=results.json phase7-feedback.js

# Or view in real-time
k6 run phase7-feedback.js
```

## Test Endpoints Covered

### Public Endpoints
- ✅ `GET /api/v1/healthz` - Health check

### Authenticated Endpoints (Employee/Admin)
- ✅ `POST /api/v1/feedback` - Create feedback
- ✅ `GET /api/v1/feedback` - List feedback
- ✅ `GET /api/v1/feedback/{id}` - Get feedback details
- ✅ `POST /api/v1/feedback/{id}/messages` - Add message

### Admin Only Endpoints
- ✅ `PATCH /api/v1/feedback/{id}` - Update feedback
- ✅ `POST /api/v1/feedback/{id}/analyze` - Queue sentiment analysis
- ✅ `GET /api/v1/exports/feedback.csv` - Export CSV

## Custom Metrics

The full test (`phase7-feedback.js`) tracks custom metrics:
- `feedback_create_time` - Time to create feedback
- `feedback_list_time` - Time to list feedback
- `feedback_detail_time` - Time to get feedback details
- `message_add_time` - Time to add a message

## Interpreting Results

### Key Metrics to Monitor

1. **Response Times**:
   - `http_req_duration` - Overall request duration
   - P95/P99 percentiles show tail latency

2. **Error Rates**:
   - `http_req_failed` - HTTP request failures
   - `errors` - Custom error metric

3. **Throughput**:
   - `http_reqs` - Total requests per second
   - `iterations` - Completed test iterations

### Example Good Results

```
✓ http_req_duration..............: avg=245.23ms min=45ms med=180ms max=890ms p(95)=480ms p(99)=750ms
✓ http_req_failed................: 0.00% ✓ 0/1250
✓ feedback_create_time...........: avg=320ms p(95)=580ms
✓ feedback_list_time.............: avg=180ms p(95)=380ms
```

### Example Issues to Watch For

- High P95/P99 times: System may be overloaded
- High error rates: System may be failing requests
- Memory leaks: Gradual increase in response times
- Database connection issues: Timeout errors

## Troubleshooting

### Common Issues

1. **401 Unauthorized**:
   - Check JWT tokens are valid and not expired
   - Verify tokens have correct roles

2. **Connection Refused**:
   - Ensure feedback backend is running on port 8086
   - Check API_BASE_URL environment variable

3. **High Error Rates**:
   - Check database connection
   - Verify backend logs for errors
   - Check if rate limiting is enabled

4. **Slow Response Times**:
   - Check database performance
   - Verify backend resource usage (CPU, memory)
   - Check network latency

## Best Practices

1. **Start with Smoke Test**: Always run smoke test first to verify system works
2. **Gradual Load Increase**: Use stages to gradually increase load
3. **Monitor Resources**: Watch CPU, memory, and database during tests
4. **Test in Staging**: Never run stress tests on production
5. **Baseline First**: Establish baseline performance before optimization
6. **Regular Testing**: Run performance tests regularly to catch regressions

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run k6 Performance Tests
  run: |
    k6 run --env API_BASE_URL=${{ secrets.API_URL }} \
           --env EMPLOYEE_TOKEN=${{ secrets.EMPLOYEE_TOKEN }} \
           --env ADMIN_TOKEN=${{ secrets.ADMIN_TOKEN }} \
           tests/perf/phase7-smoke.js
```

## Next Steps

1. Set up automated performance testing in CI/CD
2. Create performance dashboards
3. Set up alerts for performance degradation
4. Regular performance regression testing
5. Load testing before major releases

