# k6 Performance Testing Setup - Complete ✅

A comprehensive k6 performance testing suite has been set up for Phase 2 of the IT Center project.

## What Was Created

### Test Scripts

1. **`phase2-comprehensive-test.js`** - Main comprehensive test covering:
   - All leave management endpoints (balance, requests, create, update)
   - All attendance endpoints (list, clock-in, clock-out)
   - Reports (leave summary)
   - Health checks
   - Custom metrics for each endpoint type
   - Realistic test data generation

2. **Test Scenarios** (in `scenarios/` folder):
   - `smoke-test.js` - Quick validation (1 user, 1 minute)
   - `load-test.js` - Normal production load (100 users, 14 minutes)
   - `stress-test.js` - Find breaking point (up to 500 users)
   - `spike-test.js` - Sudden traffic spikes (50→500 users)

### Utilities

3. **`utils/get-token.js`** - Helper script to get JWT tokens from AWS Cognito
   - Supports environment variables or command-line arguments
   - Outputs token ready for use in k6 tests

### Documentation

4. **`K6_TESTING_GUIDE.md`** - Comprehensive guide covering:
   - Installation instructions
   - Authentication setup
   - All test scenarios explained
   - Result interpretation
   - Troubleshooting
   - Best practices

5. **`QUICK_START.md`** - 5-minute quick start guide

6. **`README.md`** - Updated with overview and quick reference

### Configuration

7. **`package.json`** - Added npm scripts:
   - `npm run test:perf` - Run comprehensive test
   - `npm run test:perf:smoke` - Run smoke test
   - `npm run test:perf:load` - Run load test
   - `npm run test:perf:stress` - Run stress test
   - `npm run test:perf:spike` - Run spike test

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

### 2. Get Token

```bash
cd leave-attendance-backend/tests/performance/utils
npm install
node get-token.js user@example.com your-password
```

### 3. Run Test

```bash
cd leave-attendance-backend/tests/performance

# Set environment variables
export API_BASE_URL=http://localhost:3000
export ACCESS_TOKEN=your-token-here

# Run smoke test
k6 run scenarios/smoke-test.js
```

## Test Coverage

The comprehensive test covers all Phase 2 endpoints:

✅ **Leave Management:**
- GET /api/v1/leave/balance
- GET /api/v1/leave/requests
- POST /api/v1/leave/requests
- PATCH /api/v1/leave/requests/{id}

✅ **Attendance:**
- GET /api/v1/attendance
- POST /api/v1/attendance/clock-in
- POST /api/v1/attendance/clock-out

✅ **Reports:**
- GET /api/v1/reports/leave-summary

✅ **System:**
- GET /healthz

## Performance Targets

- **p95 latency**: < 300ms
- **p99 latency**: < 500ms
- **Error rate**: < 1%
- **Throughput**: 100 req/s

## Next Steps

1. **Read the documentation:**
   - Start with `QUICK_START.md` for a quick overview
   - See `K6_TESTING_GUIDE.md` for comprehensive details

2. **Run your first test:**
   ```bash
   npm run test:perf:smoke
   ```

3. **Customize for your needs:**
   - Adjust load profiles in scenario files
   - Modify test data generation
   - Add custom metrics

4. **Integrate into CI/CD:**
   - See `K6_TESTING_GUIDE.md` for GitHub Actions example

## File Structure

```
tests/performance/
├── phase2-comprehensive-test.js    # Main test script
├── attendance-load-test.js          # Legacy (deprecated)
├── scenarios/
│   ├── smoke-test.js               # Quick validation
│   ├── load-test.js                # Normal load
│   ├── stress-test.js              # Stress test
│   └── spike-test.js               # Spike test
├── utils/
│   ├── get-token.js                # Token helper
│   └── package.json                # Utils dependencies
├── README.md                        # Overview
├── QUICK_START.md                   # Quick start guide
├── K6_TESTING_GUIDE.md             # Comprehensive guide
└── SETUP_COMPLETE.md              # This file
```

## Support

For questions or issues:
- Check `K6_TESTING_GUIDE.md` troubleshooting section
- Review test output JSON files
- Check CloudWatch logs for API errors

Happy testing! 🚀

