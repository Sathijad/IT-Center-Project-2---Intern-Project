# k6 Performance Testing - Quick Start Guide

## Quick Setup (5 minutes)

### 1. Install k6

**Windows:**
```powershell
# Using Chocolatey
choco install k6

# Or download from https://k6.io/docs/getting-started/installation/
```

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
# See https://k6.io/docs/getting-started/installation/ for details
```

### 2. Verify Installation
```bash
k6 version
```

### 3. Set Environment Variables

**Windows PowerShell:**
```powershell
$env:BASE_URL="http://localhost:5167"
$env:AUTH_TOKEN="your-jwt-token-here"
```

**Linux/macOS:**
```bash
export BASE_URL="http://localhost:5167"
export AUTH_TOKEN="your-jwt-token-here"
```

### 4. Run Your First Test

**Using PowerShell script:**
```powershell
cd performance-backend/k6-tests
.\run-tests.ps1 smoke
```

**Using Bash script:**
```bash
cd performance-backend/k6-tests
./run-tests.sh smoke
```

**Direct k6 command:**
```bash
cd performance-backend/k6-tests
k6 run tests/smoke.js
```

## Available Tests

| Test | Command | Description |
|------|---------|-------------|
| **Smoke** | `.\run-tests.ps1 smoke` | Quick health check (1 VU, 1 min) |
| **Metrics** | `.\run-tests.ps1 metrics` | Performance metrics endpoints (10 VUs) |
| **CRUD** | `.\run-tests.ps1 crud` | Create/Read operations (5 VUs) |
| **Training** | `.\run-tests.ps1 training` | Training endpoints (8 VUs) |
| **Mixed** | `.\run-tests.ps1 mixed` | Realistic mixed load (15 VUs) |

## Example Output

```
          /\      |‾‾| /‾‾/   /‾‾/   
     /\  /  \     |  |/  /   /  /    
    /  \/    \    |     (   /   ‾‾\  
   /          \   |  |\  \ |  (‾)  | 
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: tests/smoke.js
     output: -

  scenarios: (100.00%) 1 scenario, 1 max VUs, 1m0s max duration
           * default: 1 looping VUs for 1m0s (gracefulStop: 30s)

     ✓ health check status is 200
     ✓ get metrics status is 200
     ✓ get KPIs status is 200
     ✓ get courses status is 200

     checks.........................: 100.00% ✓ 4        ✗ 0
     data_received..................: 12 kB   200 B/s
     data_sent......................: 1.1 kB  18 B/s
     http_req_duration..............: avg=145ms min=120ms med=140ms max=180ms
     http_req_failed................: 0.00%   ✓ 0        ✗ 4
     http_reqs.....................: 4       0.066667/s
     iteration_duration.............: avg=1.2s min=1.1s med=1.2s max=1.3s
     iterations.....................: 1       0.016667/s
     vus............................: 1      min=1      max=1
     vus_max........................: 1      min=1      max=1

running (1m00.0s), 0/1 VUs, 1 complete and 0 interrupted iterations
default ✓ [======================================] 1 VUs  1m0s

     ✓ health check status is 200
     ✓ get metrics status is 200
     ✓ get KPIs status is 200
     ✓ get courses status is 200

     checks.........................: 100.00% ✓ 4        ✗ 0
     data_received..................: 12 kB   200 B/s
     data_sent......................: 1.1 kB  18 B/s
     http_req_duration..............: avg=145ms min=120ms med=140ms max=180ms
     http_req_failed................: 0.00%   ✓ 0        ✗ 4
     http_reqs.....................: 4       0.066667/s
     iteration_duration.............: avg=1.2s min=1.1s med=1.2s max=1.3s
     iterations.....................: 1       0.016667/s
     vus............................: 1      min=1      max=1
     vus_max........................: 1      min=1      max=1
```

## Understanding Results

### Key Metrics

- **http_req_duration**: Response time (avg, min, max, percentiles)
- **http_req_failed**: Error rate (should be < 1-2%)
- **http_reqs**: Total requests per second
- **checks**: Pass/fail rate of assertions
- **vus**: Virtual users (concurrent users)

### Thresholds

Tests will **PASS** if:
- 95% of requests complete in < 500-800ms
- Error rate < 1-2%
- All checks pass

Tests will **FAIL** if thresholds are exceeded.

## Next Steps

1. **Start with smoke test** to verify system is working
2. **Run load tests** to test normal usage
3. **Run stress tests** to find breaking points
4. **Monitor results** and optimize based on findings

## Troubleshooting

**"k6: command not found"**
- Install k6 (see step 1)

**"401 Unauthorized"**
- Set AUTH_TOKEN environment variable
- Verify token is valid and not expired

**"Connection refused"**
- Verify API is running on correct port
- Check BASE_URL environment variable

**High error rates**
- Check API server logs
- Verify database connectivity
- Check server resources

## More Information

See [README.md](README.md) for detailed documentation.

