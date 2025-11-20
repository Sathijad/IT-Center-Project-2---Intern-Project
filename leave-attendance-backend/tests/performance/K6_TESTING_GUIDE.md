# k6 Performance Testing Guide for Phase 2

This guide covers performance testing of the Phase 2 Leave & Attendance Management API using k6.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Getting Authentication Tokens](#getting-authentication-tokens)
- [Running Tests](#running-tests)
- [Test Scenarios](#test-scenarios)
- [Understanding Results](#understanding-results)
- [Best Practices](#best-practices)

## Prerequisites

- Node.js 18+ installed
- AWS CLI configured (for token generation)
- Access to AWS Cognito User Pool
- API endpoint accessible (local or deployed)

## Installation

### Install k6

**Windows (using Chocolatey):**
```powershell
choco install k6
```

**macOS (using Homebrew):**
```bash
brew install k6
```

**Linux:**
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Verify installation:**
```bash
k6 version
```

### Install AWS SDK (for token generation)

```bash
cd leave-attendance-backend/tests/performance
npm install @aws-sdk/client-cognito-identity-provider
```

## Getting Authentication Tokens

All Phase 2 endpoints require JWT authentication via AWS Cognito. You need to obtain a valid access token before running tests.

### Option 1: Using the Helper Script

```bash
cd leave-attendance-backend/tests/performance

# Set environment variables
export COGNITO_USERNAME=user@example.com
export COGNITO_PASSWORD=your-password
export COGNITO_CLIENT_ID=3rdnl5ind8guti89jrbob85r4i
export COGNITO_REGION=ap-southeast-2

# Or pass as arguments
node utils/get-token.js user@example.com your-password
```

The script will output the access token. Copy it for use in k6 tests.

### Option 2: Manual Token Retrieval

1. Use AWS CLI:
```bash
aws cognito-idp initiate-auth \
  --client-id 3rdnl5ind8guti89jrbob85r4i \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=user@example.com,PASSWORD=your-password \
  --region ap-southeast-2
```

2. Extract the `AccessToken` from the response.

### Option 3: Using Postman/API Client

1. Use the Postman collection to authenticate
2. Copy the `access_token` from the collection variables
3. Use it in k6 tests

### Setting Tokens for Tests

**Windows PowerShell:**
```powershell
$env:ACCESS_TOKEN="your-access-token-here"
$env:ADMIN_TOKEN="admin-access-token-here"  # Optional, for admin endpoints
```

**Linux/macOS:**
```bash
export ACCESS_TOKEN="your-access-token-here"
export ADMIN_TOKEN="admin-access-token-here"  # Optional
```

## Running Tests

### Basic Test Run

```bash
cd leave-attendance-backend/tests/performance

# Set environment variables
export API_BASE_URL=http://localhost:3000
export ACCESS_TOKEN=your-token-here

# Run comprehensive test
k6 run phase2-comprehensive-test.js
```

### Using npm Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "test:perf": "k6 run tests/performance/phase2-comprehensive-test.js",
    "test:perf:smoke": "k6 run tests/performance/scenarios/smoke-test.js",
    "test:perf:load": "k6 run tests/performance/scenarios/load-test.js",
    "test:perf:stress": "k6 run tests/performance/scenarios/stress-test.js",
    "test:perf:spike": "k6 run tests/performance/scenarios/spike-test.js"
  }
}
```

Then run:
```bash
npm run test:perf:smoke -- --env API_BASE_URL=http://localhost:3000 --env ACCESS_TOKEN=your-token
```

### Test Scenarios

#### 1. Smoke Test
Quick validation that all endpoints work:
```bash
k6 run scenarios/smoke-test.js \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token
```

**Characteristics:**
- 1 user for 1 minute
- Validates all endpoints
- Lenient thresholds (5% error rate allowed)

#### 2. Load Test
Normal expected production load:
```bash
k6 run scenarios/load-test.js \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token
```

**Characteristics:**
- Ramps up to 100 concurrent users
- Sustains load for 5 minutes
- Strict thresholds (p95 < 300ms, < 1% errors)

#### 3. Stress Test
Find the breaking point:
```bash
k6 run scenarios/stress-test.js \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token
```

**Characteristics:**
- Gradually increases to 500 users
- More lenient thresholds
- Identifies performance degradation points

#### 4. Spike Test
Test sudden traffic spikes:
```bash
k6 run scenarios/spike-test.js \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token
```

**Characteristics:**
- Sudden spikes from 50 to 500 users
- Tests system recovery
- Simulates real-world traffic patterns

### Custom Test Scenarios

You can customize tests by setting the `SCENARIO` environment variable:

```bash
# Test only leave endpoints
k6 run phase2-comprehensive-test.js \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token \
  --env SCENARIO=leave-only

# Test only attendance endpoints
k6 run phase2-comprehensive-test.js \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token \
  --env SCENARIO=attendance-only

# Test only reports
k6 run phase2-comprehensive-test.js \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token \
  --env ADMIN_TOKEN=admin-token \
  --env SCENARIO=reports-only
```

## Understanding Results

### Key Metrics

k6 provides several built-in metrics:

- **http_req_duration**: Response time for all requests
- **http_reqs**: Total number of requests
- **http_req_failed**: Failed request rate
- **vus**: Virtual users (concurrent users)
- **iterations**: Total test iterations

### Custom Metrics

The comprehensive test includes custom metrics:

- **leave_balance_duration**: Time to get leave balances
- **leave_requests_list_duration**: Time to list leave requests
- **leave_request_create_duration**: Time to create leave request
- **attendance_list_duration**: Time to list attendance logs
- **attendance_clock_in_duration**: Time to clock in
- **attendance_clock_out_duration**: Time to clock out
- **leave_summary_duration**: Time to generate leave summary report

### Sample Output

```
     ✓ leave balance status is 200
     ✓ leave balance has balances array
     ✓ list leave requests status is 200
     ✓ create leave request status is 201 or 409
     ✓ clock in status is 201 or 409
     ✓ clock out status is 200 or 404

     checks.........................: 95.00% ✓ 1900 ✗ 100
     data_received..................: 2.5 MB  42 kB/s
     data_sent......................: 1.2 MB  20 kB/s
     http_req_duration..............: avg=145ms min=45ms med=120ms max=850ms p(95)=280ms p(99)=450ms
     http_req_failed................: 0.50%   ✓ 0.005
     http_reqs......................: 2000    33.33/s
     iteration_duration............: avg=2.1s min=0.8s med=1.9s max=5.2s
     vus............................: 100     min=1 max=100
     vus_max........................: 100     min=1 max=100

     leave_balance_duration.........: avg=120ms min=50ms med=110ms max=400ms p(95)=250ms
     attendance_clock_in_duration...: avg=180ms min=60ms med=160ms max=600ms p(95)=290ms
```

### Interpreting Results

**Good Performance:**
- p95 latency < 300ms
- Error rate < 1%
- All thresholds passing

**Performance Issues:**
- p95 latency > 300ms → Consider database optimization, caching
- Error rate > 1% → Check logs, database connections, Lambda cold starts
- High p99 latency → Investigate slow queries, network issues

### Exporting Results

Results are automatically saved to JSON files:
- `phase2-performance-<timestamp>.json`

You can also export to other formats:
```bash
# Export to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 phase2-comprehensive-test.js

# Export to CloudWatch
k6 run --out cloudwatch phase2-comprehensive-test.js

# Export to CSV
k6 run --out csv=results.csv phase2-comprehensive-test.js
```

## Best Practices

### 1. Start with Smoke Tests
Always run smoke tests first to ensure basic functionality works.

### 2. Test in Staging Before Production
Never run stress tests directly against production without approval.

### 3. Monitor During Tests
- Watch CloudWatch metrics (Lambda invocations, errors, duration)
- Monitor database connections and query performance
- Check API Gateway throttling

### 4. Use Realistic Data
- Use actual user tokens (not expired)
- Test with realistic GPS coordinates
- Use appropriate date ranges

### 5. Test Different Scenarios
- Mix of read and write operations
- Different user roles (EMPLOYEE vs ADMIN)
- Various endpoint combinations

### 6. Document Results
- Save test results for comparison
- Document any performance regressions
- Track improvements over time

### 7. Token Management
- Tokens expire after 1 hour (default Cognito)
- Refresh tokens before long-running tests
- Use separate tokens for admin vs employee tests

## Troubleshooting

### Authentication Errors (401)

**Problem:** All requests return 401 Unauthorized

**Solutions:**
1. Verify token is valid: `echo $ACCESS_TOKEN`
2. Check token expiration (Cognito tokens expire after 1 hour)
3. Regenerate token using `utils/get-token.js`
4. Verify API endpoint is correct

### High Error Rates

**Problem:** Error rate > 1%

**Solutions:**
1. Check API logs (CloudWatch for Lambda)
2. Verify database connectivity
3. Check for rate limiting (API Gateway throttling)
4. Reduce concurrent users
5. Check Lambda cold starts

### Slow Response Times

**Problem:** p95 latency > 300ms

**Solutions:**
1. Check database query performance
2. Enable Lambda provisioned concurrency
3. Check network latency
4. Review Lambda memory allocation
5. Check for database connection pool exhaustion

### Test Failures

**Problem:** Tests fail with connection errors

**Solutions:**
1. Verify API_BASE_URL is correct
2. Check if API is running and accessible
3. Test health endpoint: `curl $API_BASE_URL/healthz`
4. Check firewall/security group rules

## Performance Targets

Based on Phase 2 requirements:

| Metric | Target | Acceptable |
|--------|--------|------------|
| p95 Latency | < 300ms | < 500ms |
| p99 Latency | < 500ms | < 1000ms |
| Error Rate | < 1% | < 5% |
| Throughput | 100 req/s | 50 req/s |

## Continuous Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/k6-action@v0.3.0
        with:
          filename: leave-attendance-backend/tests/performance/scenarios/smoke-test.js
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN }}
```

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 JavaScript API](https://k6.io/docs/javascript-api/)
- [AWS Cognito Authentication](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html)
- [Phase 2 API Documentation](../docs/openapi/leave-attendance.yaml)

## Support

For issues or questions:
- Check CloudWatch logs for API errors
- Review test output JSON files
- Consult Phase 2 runbook: `docs/PHASE2_RUNBOOK.md`

