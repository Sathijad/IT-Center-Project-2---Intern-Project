# k6 Performance Testing for Phase 6

This directory contains k6 performance and load testing scripts for the Phase 6 Performance & Training Module API.

## Prerequisites

1. **Install k6**
   ```bash
   # Windows (using Chocolatey)
   choco install k6
   
   # Windows (using Scoop)
   scoop install k6
   
   # macOS
   brew install k6
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **Verify Installation**
   ```bash
   k6 version
   ```

3. **Set Environment Variables** (Optional)
   ```bash
   # Windows PowerShell
   $env:BASE_URL="http://localhost:5167"
   $env:AUTH_TOKEN="your-jwt-token-here"
   
   # Linux/macOS
   export BASE_URL="http://localhost:5167"
   export AUTH_TOKEN="your-jwt-token-here"
   ```

## Test Scripts

### 1. Smoke Test (`tests/smoke.js`)
Quick verification that the system is working with minimal load.

```bash
k6 run tests/smoke.js
```

**Purpose:** Verify basic functionality before running larger tests  
**Load:** 1 virtual user for 1 minute

---

### 2. Performance Metrics Test (`tests/performance-metrics.js`)
Tests GET endpoints for metrics, KPIs, and time-series data.

```bash
k6 run tests/performance-metrics.js
```

**Purpose:** Test read-heavy scenarios for metrics endpoints  
**Load:** 10 virtual users, ramping up over 1 minute

**Endpoints Tested:**
- `GET /api/v1/perf/metrics` (with various filters)
- `GET /api/v1/perf/metrics/timeseries`
- `GET /api/v1/perf/kpis`

---

### 3. Performance CRUD Test (`tests/performance-crud.js`)
Tests POST/GET operations for KPIs, Targets, and Actuals.

```bash
k6 run tests/performance-crud.js
```

**Purpose:** Test write operations and data creation  
**Load:** 5 virtual users

**Endpoints Tested:**
- `POST /api/v1/perf/kpis`
- `GET /api/v1/perf/kpis/{id}`
- `POST /api/v1/perf/targets`
- `POST /api/v1/perf/actuals`
- `GET /api/v1/perf/actuals/my`

---

### 4. Training Test (`tests/training.js`)
Tests training courses and assignments endpoints.

```bash
k6 run tests/training.js
```

**Purpose:** Test training module endpoints  
**Load:** 8 virtual users

**Endpoints Tested:**
- `GET /api/v1/training/courses`
- `POST /api/v1/training/courses`
- `GET /api/v1/training/courses/{id}`
- `PATCH /api/v1/training/courses/{id}`
- `POST /api/v1/training/assign`
- `GET /api/v1/training/assignments`
- `PATCH /api/v1/training/assignments/{id}`

---

### 5. Mixed Load Test (`tests/mixed-load.js`)
Simulates realistic user behavior with mixed endpoint calls.

```bash
k6 run tests/mixed-load.js
```

**Purpose:** Realistic load simulation  
**Load:** 15 virtual users

**Traffic Distribution:**
- 80% browsing KPIs and metrics
- 15% viewing training courses
- 5% creating/updating data

---

## Running Tests

### Basic Run
```bash
cd k6-tests
k6 run tests/smoke.js
```

### With Custom Base URL
```bash
k6 run --env BASE_URL=http://localhost:5167 tests/smoke.js
```

### With Authentication Token
```bash
k6 run --env AUTH_TOKEN="your-token-here" tests/performance-metrics.js
```

### With Output to File
```bash
k6 run --out json=results.json tests/mixed-load.js
```

### With Summary Report
```bash
k6 run --summary-export=summary.json tests/performance-metrics.js
```

## Test Scenarios

### Smoke Test
- **Duration:** 1 minute
- **Virtual Users:** 1
- **Purpose:** Quick health check

### Load Test
- **Duration:** 5 minutes
- **Virtual Users:** 10 (ramping)
- **Purpose:** Normal expected load

### Stress Test
- **Duration:** 16 minutes
- **Virtual Users:** Up to 30
- **Purpose:** Test beyond normal capacity

### Spike Test
- **Duration:** 4.5 minutes
- **Virtual Users:** Up to 50 (sudden spike)
- **Purpose:** Test system under sudden load increase

### Soak Test
- **Duration:** 30 minutes
- **Request Rate:** 5 requests/second
- **Purpose:** Test for memory leaks and stability

## Thresholds

All tests include performance thresholds:

- **HTTP Request Duration:**
  - 95th percentile < 500-800ms (depending on endpoint)
  - 99th percentile < 1000-1500ms

- **HTTP Request Failure Rate:**
  - < 1-2% (depending on test)

- **Error Rate:**
  - < 10%

## Custom Metrics

Tests track custom metrics:
- `errors` - Rate of failed checks
- `checks` - Individual check results with tags

## Configuration

Edit `config.js` to customize:
- Base URL
- Test scenarios
- Thresholds
- Load patterns

## Authentication

The tests require JWT authentication. You can:

1. **Set AUTH_TOKEN environment variable:**
   ```bash
   export AUTH_TOKEN="your-jwt-token"
   ```

2. **Modify `helpers/auth.js`** to implement actual authentication flow

3. **Use test credentials** (if authentication endpoint exists)

## Results Interpretation

### Key Metrics to Monitor

1. **http_req_duration**
   - Average, min, max, p(90), p(95), p(99)
   - Should be within thresholds

2. **http_req_failed**
   - Error rate should be < 1-2%

3. **iterations**
   - Total number of test iterations completed

4. **vus**
   - Number of virtual users at any point

### Example Output

```
     ✓ metrics snapshot status is 200
     ✓ metrics snapshot has data
     ✓ metrics snapshot response time < 500ms
     ...
     
     checks.........................: 95.00% ✓ 95      ✗ 5
     data_received..................: 1.2 MB 20 kB/s
     data_sent......................: 45 kB  750 B/s
     http_req_duration..............: avg=245ms min=120ms med=230ms max=890ms p(90)=420ms p(95)=580ms p(99)=850ms
     http_req_failed................: 0.50%  ✓ 1       ✗ 199
     http_reqs.....................: 200    3.333333/s
     iteration_duration.............: avg=1.2s min=0.5s med=1.1s max=3.5s
     vus............................: 10     min=1     max=10
```

## Troubleshooting

### Authentication Errors
- Verify `AUTH_TOKEN` is set correctly
- Check token expiration
- Ensure token has required permissions

### Connection Errors
- Verify API is running on correct port
- Check `BASE_URL` environment variable
- Ensure firewall/network allows connections

### High Error Rates
- Check API logs for errors
- Verify database connectivity
- Check resource limits (CPU, memory)

### Slow Response Times
- Monitor database performance
- Check for N+1 query problems
- Verify indexes are in place
- Monitor server resources

## Best Practices

1. **Start with Smoke Tests**
   - Always run smoke test first
   - Verify system is healthy before load testing

2. **Gradual Load Increase**
   - Start with low load
   - Gradually increase to find breaking point

3. **Monitor During Tests**
   - Watch API logs
   - Monitor database performance
   - Check server resources

4. **Run Tests Regularly**
   - Include in CI/CD pipeline
   - Run before releases
   - Monitor performance trends

5. **Document Results**
   - Save test results
   - Track performance over time
   - Identify regressions early

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run k6 Performance Tests
  run: |
    cd performance-backend/k6-tests
    k6 run --env BASE_URL=${{ env.API_URL }} --env AUTH_TOKEN=${{ secrets.AUTH_TOKEN }} tests/smoke.js
```

### Azure DevOps Example
```yaml
- task: Bash@3
  displayName: 'Run k6 Tests'
  inputs:
    targetType: 'inline'
    script: |
      cd performance-backend/k6-tests
      k6 run tests/smoke.js
```

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 JavaScript API](https://k6.io/docs/javascript-api/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)

## Support

For issues or questions:
1. Check k6 documentation
2. Review test logs
3. Check API server logs
4. Verify environment configuration

