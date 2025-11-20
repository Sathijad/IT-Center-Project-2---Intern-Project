# Allure Report Results Summary

## ✅ Report Generated Successfully

**Date**: 2025-11-20  
**Location**: `leave-attendance-backend/allure-report/index.html`

## Test Execution Summary

### Health Check Test (Phase 1 API)

**Test Configuration:**
- API: http://localhost:8080
- Duration: 30 seconds
- Virtual Users: 5
- Endpoint: GET /healthz

**Results:**
- ✅ Total Requests: 136
- ✅ Failed Requests: 0 (0.00%)
- ✅ Average Response Time: 113.01ms
- ✅ p95 Response Time: 485.40ms
- ✅ Status: PASSED

**Threshold Status:**
- ⚠️ http_req_duration p(95)<200: SLIGHTLY EXCEEDED (485ms)
- ✅ http_req_failed rate<0.01: PASSED (0.00%)

## Allure Report Contents

### Test Cases
- **1 test case** created: "Performance Test Execution"
  - Health Check endpoint test
  - Includes detailed metrics and threshold status

### Report Features
- ✅ Test execution timeline
- ✅ Performance metrics (avg, p95, p99)
- ✅ Threshold pass/fail status
- ✅ Environment information
- ✅ k6 JSON results as attachment

## Viewing the Report

### Option 1: Open in Browser
```powershell
cd leave-attendance-backend
npm run allure:open
```

### Option 2: Direct File Open
```powershell
Start-Process "allure-report\index.html"
```

### Option 3: Serve Live
```powershell
npm run allure:serve
```

## What You'll See in Allure

1. **Overview Dashboard**
   - Total tests: 1
   - Passed: 1
   - Failed: 0
   - Duration: ~30 seconds

2. **Test Case Details**
   - Endpoint: GET /healthz
   - Performance metrics
   - Threshold status
   - Request/response details

3. **Graphs & Trends**
   - Response time distribution
   - Test execution timeline

## Next Steps for Multiple Test Cases

To see **8-9 test cases** (one per endpoint), you need to:

1. **Start Phase 2 API:**
   ```powershell
   cd leave-attendance-backend
   npm start
   ```

2. **Get Authentication Token:**
   ```powershell
   cd tests/performance/utils
   npm install
   node get-token.js user@example.com your-password
   ```

3. **Run Comprehensive Test:**
   ```powershell
   cd leave-attendance-backend
   $env:API_BASE_URL="http://localhost:3000"
   $env:ACCESS_TOKEN="your-token-here"
   npm run test:perf:allure
   ```

4. **Generate Report:**
   ```powershell
   npm run allure:generate
   npm run allure:open
   ```

This will create test cases for:
- Health Check
- Get Leave Balance
- List Leave Requests
- Create Leave Request
- Update Leave Request
- List Attendance Logs
- Clock In
- Clock Out
- Leave Summary Report

---

**Current Status**: ✅ Report generated with 1 test case (Health Check)  
**Ready for**: Full comprehensive test with all endpoints


