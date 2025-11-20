# Performance Testing with k6

> **📖 For comprehensive documentation, see [K6_TESTING_GUIDE.md](./K6_TESTING_GUIDE.md)**  
> **🚀 New to k6? Start with [QUICK_START.md](./QUICK_START.md)**

## Quick Start

### 1. Install k6

**Windows:**
```powershell
choco install k6
```

**macOS:**
```bash
brew install k6
```

**Linux:**
See [k6 installation guide](https://k6.io/docs/getting-started/installation/)

### 2. Get Authentication Token

```bash
cd tests/performance/utils
npm install
node get-token.js user@example.com your-password
```

### 3. Run Tests

**Using npm scripts:**
```bash
# Set environment variables
export API_BASE_URL=http://localhost:3000
export ACCESS_TOKEN=your-token-here

# Run different scenarios
npm run test:perf:smoke    # Quick smoke test
npm run test:perf:load     # Normal load test
npm run test:perf:stress   # Stress test
npm run test:perf:spike    # Spike test
```

**Direct k6 commands:**
```bash
k6 run tests/performance/scenarios/smoke-test.js \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token
```

## Test Files

### Main Test Script
- **`phase2-comprehensive-test.js`** - Comprehensive test covering all Phase 2 endpoints
  - Leave management (balance, requests, create, update)
  - Attendance (list, clock-in, clock-out)
  - Reports (leave summary)
  - Health checks

### Test Scenarios
- **`scenarios/smoke-test.js`** - Quick validation test (1 user, 1 minute)
- **`scenarios/load-test.js`** - Normal production load (100 users, 14 minutes)
- **`scenarios/stress-test.js`** - Find breaking point (up to 500 users)
- **`scenarios/spike-test.js`** - Sudden traffic spikes (50→500 users)

### Legacy
- **`attendance-load-test.js`** - Legacy attendance-only test (deprecated, use comprehensive test)

### Utilities
- **`utils/get-token.js`** - Helper script to get JWT tokens from AWS Cognito

## Performance Targets

Based on Phase 2 requirements:

| Metric | Target | Acceptable |
|--------|--------|------------|
| p95 Latency | < 300ms | < 500ms |
| p99 Latency | < 500ms | < 1000ms |
| Error Rate | < 1% | < 5% |
| Throughput | 100 req/s | 50 req/s |

## Test Coverage

The comprehensive test covers all Phase 2 API endpoints:

### Leave Management
- ✅ `GET /api/v1/leave/balance` - Get leave balances
- ✅ `GET /api/v1/leave/requests` - List leave requests
- ✅ `POST /api/v1/leave/requests` - Create leave request
- ✅ `PATCH /api/v1/leave/requests/{id}` - Update leave status (admin)

### Attendance
- ✅ `GET /api/v1/attendance` - List attendance logs
- ✅ `POST /api/v1/attendance/clock-in` - Clock in
- ✅ `POST /api/v1/attendance/clock-out` - Clock out

### Reports
- ✅ `GET /api/v1/reports/leave-summary` - Leave summary report (admin)

### System
- ✅ `GET /healthz` - Health check

## Customization

### Test Specific Endpoints

Set the `SCENARIO` environment variable:

```bash
# Test only leave endpoints
k6 run phase2-comprehensive-test.js \
  --env SCENARIO=leave-only \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token

# Test only attendance endpoints
k6 run phase2-comprehensive-test.js \
  --env SCENARIO=attendance-only \
  --env API_BASE_URL=http://localhost:3000 \
  --env ACCESS_TOKEN=your-token
```

### Custom Load Profile

Edit the `options` in any scenario file:

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '3m', target: 100 },   // Sustained load
    { duration: '1m', target: 0 },      // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300'],
    'errors': ['rate<0.01'],
  },
};
```

## Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Get started in 5 minutes
- **[K6_TESTING_GUIDE.md](./K6_TESTING_GUIDE.md)** - Complete testing guide with:
  - Detailed installation instructions
  - Authentication setup
  - All test scenarios explained
  - Result interpretation
  - Troubleshooting guide
  - Best practices
- **[Phase 2 API Docs](../../docs/openapi/leave-attendance.yaml)** - API specification

## Example Results

```
✓ leave balance status is 200
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

leave_balance_duration.........: avg=120ms min=50ms med=110ms max=400ms p(95)=250ms
attendance_clock_in_duration...: avg=180ms min=60ms med=160ms max=600ms p(95)=290ms

Thresholds:
  http_req_duration: p(95)<300: ✅ PASS
  errors: rate<0.01: ✅ PASS
```

## Support

For issues or questions:
- Check [K6_TESTING_GUIDE.md](./K6_TESTING_GUIDE.md) troubleshooting section
- Review CloudWatch logs for API errors
- Check test output JSON files for detailed metrics
- Consult Phase 2 runbook: `docs/PHASE2_RUNBOOK.md`
