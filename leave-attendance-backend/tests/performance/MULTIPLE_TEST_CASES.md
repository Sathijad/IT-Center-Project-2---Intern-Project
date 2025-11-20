# Multiple Test Cases in Allure Reports

## Current Status

The k6 to Allure converter has been enhanced to create **multiple test cases** - one for each endpoint tested.

## How It Works

The converter automatically detects custom metrics in k6 results and creates separate test cases for each endpoint:

### Test Cases Created Per Endpoint:

1. **Health Check** (`health_check_duration`)
   - GET /healthz

2. **Leave Management** (`leave_balance_duration`, `leave_requests_list_duration`, etc.)
   - GET /api/v1/leave/balance
   - GET /api/v1/leave/requests
   - POST /api/v1/leave/requests
   - PATCH /api/v1/leave/requests/{id}

3. **Attendance** (`attendance_list_duration`, `attendance_clock_in_duration`, etc.)
   - GET /api/v1/attendance
   - POST /api/v1/attendance/clock-in
   - POST /api/v1/attendance/clock-out

4. **Reports** (`leave_summary_duration`)
   - GET /api/v1/reports/leave-summary

## Why You See Only One Test Case

The **health check test** (`health-check-test.js`) only tests one endpoint (`/healthz`), so it creates **1 test case**.

To see **multiple test cases**, you need to run the **comprehensive test** which tests all endpoints.

## How to Get Multiple Test Cases

### Option 1: Run Comprehensive Test

```powershell
cd leave-attendance-backend

# Set environment variables
$env:API_BASE_URL="http://localhost:3000"
$env:ACCESS_TOKEN="your-token-here"

# Run comprehensive test (tests all endpoints)
npm run test:perf:allure

# Generate report
npm run allure:generate
npm run allure:open
```

This will create **8-9 test cases** (one per endpoint).

### Option 2: Run Specific Scenario Tests

```powershell
# Load test (tests multiple endpoints)
npm run test:perf:allure:load

# Stress test
npm run test:perf:allure:stress
```

## Example: Comprehensive Test Results

When you run the comprehensive test, you'll see test cases like:

```
✅ Test Cases Created: 8
   - Health Check
   - Get Leave Balance
   - List Leave Requests
   - Create Leave Request
   - Update Leave Request
   - List Attendance Logs
   - Clock In
   - Clock Out
   - Leave Summary Report
```

## What Each Test Case Shows

Each test case in Allure will display:

- **Endpoint Details**: Method, URL, Category
- **Performance Metrics**: 
  - Request count
  - Average, Min, Max response times
  - p95, p99 percentiles
- **Threshold Status**: Pass/Fail for that specific endpoint
- **Labels**: Framework (k6), Category, Feature, Story

## Viewing in Allure

1. **Test Cases Tab**: See all individual endpoint tests
2. **Suites Tab**: Grouped by test suite
3. **Graphs**: Performance trends per endpoint
4. **Categories**: Grouped by feature (Leave Management, Attendance, Reports)

## Current Test File

The `health-check-1763581229585.json` file you converted only contains:
- 1 endpoint test (Health Check)
- 1 custom metric (`health_check_duration`)

That's why you see **1 test case**.

## Next Steps

To see multiple test cases:

1. **Run comprehensive test:**
   ```powershell
   npm run test:perf:allure
   ```

2. **Or convert a comprehensive test result:**
   ```powershell
   # After running comprehensive test, convert the JSON
   node tests/performance/k6-to-allure.js phase2-performance-*.json
   ```

3. **Generate and view report:**
   ```powershell
   npm run allure:generate
   npm run allure:open
   ```

---

**Note**: The converter automatically detects which endpoints were tested based on the custom metrics in the k6 JSON file. More endpoints tested = more test cases created!


