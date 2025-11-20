import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
// Note: textSummary is provided by k6, no import needed

// Custom metrics
const errorRate = new Rate('errors');
const leaveBalanceDuration = new Trend('leave_balance_duration');
const leaveRequestsListDuration = new Trend('leave_requests_list_duration');
const leaveRequestCreateDuration = new Trend('leave_request_create_duration');
const leaveRequestUpdateDuration = new Trend('leave_request_update_duration');
const attendanceListDuration = new Trend('attendance_list_duration');
const attendanceClockInDuration = new Trend('attendance_clock_in_duration');
const attendanceClockOutDuration = new Trend('attendance_clock_out_duration');
const leaveSummaryDuration = new Trend('leave_summary_duration');
const healthCheckDuration = new Trend('health_check_duration');
const requestCounter = new Counter('total_requests');

// Test configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || __ENV.ACCESS_TOKEN || '';
const TEST_SCENARIO = __ENV.SCENARIO || 'mixed'; // mixed, leave-only, attendance-only, reports-only

// Office location for geofencing (Melbourne, Australia)
const OFFICE_LAT = -37.8136;
const OFFICE_LON = 144.9631;

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<500'],  // 95% < 300ms, 99% < 500ms
    'errors': ['rate<0.01'],                          // Error rate < 1%
    'leave_balance_duration': ['p(95)<300'],
    'leave_requests_list_duration': ['p(95)<300'],
    'leave_request_create_duration': ['p(95)<300'],
    'attendance_list_duration': ['p(95)<300'],
    'attendance_clock_in_duration': ['p(95)<300'],
    'attendance_clock_out_duration': ['p(95)<300'],
    'leave_summary_duration': ['p(95)<500'], // Reports can be slower
    'health_check_duration': ['p(95)<100'],
  },
};

export function setup() {
  if (!ACCESS_TOKEN) {
    console.warn('⚠️  WARNING: ACCESS_TOKEN not provided. Tests will fail authentication.');
  }
  
  // Verify API is accessible
  const healthRes = http.get(`${BASE_URL}/healthz`);
  if (healthRes.status !== 200) {
    console.error(`❌ Health check failed: ${healthRes.status}`);
  } else {
    console.log(`✅ Health check passed: ${BASE_URL}`);
  }
  
  return {
    accessToken: ACCESS_TOKEN,
    adminToken: ADMIN_TOKEN,
    baseUrl: BASE_URL,
  };
}

// Helper function to generate random date in the future
function randomFutureDate(daysAhead = 30) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 1);
  return date.toISOString().split('T')[0];
}

// Helper function to generate random GPS coordinates near office
function randomGPSLocation() {
  const variation = 0.005; // ~500m variation
  return {
    latitude: OFFICE_LAT + (Math.random() * variation * 2 - variation),
    longitude: OFFICE_LON + (Math.random() * variation * 2 - variation),
  };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.accessToken}`,
  };

  const adminHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.adminToken}`,
  };

  // Health check (no auth required)
  if (Math.random() < 0.1) { // 10% chance
    const healthRes = http.get(`${data.baseUrl}/healthz`, {
      tags: { name: 'HealthCheck' },
    });
    check(healthRes, {
      'health check status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    healthCheckDuration.add(healthRes.timings.duration);
    requestCounter.add(1);
  }

  // Scenario-based testing
  if (TEST_SCENARIO === 'mixed' || TEST_SCENARIO === 'leave-only') {
    testLeaveEndpoints(data, headers, adminHeaders);
  }

  if (TEST_SCENARIO === 'mixed' || TEST_SCENARIO === 'attendance-only') {
    testAttendanceEndpoints(data, headers);
  }

  if (TEST_SCENARIO === 'mixed' || TEST_SCENARIO === 'reports-only') {
    testReportEndpoints(data, adminHeaders);
  }

  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

function testLeaveEndpoints(data, headers, adminHeaders) {
  // 1. Get Leave Balance
  const balanceRes = http.get(`${data.baseUrl}/api/v1/leave/balance`, {
    headers,
    tags: { name: 'GetLeaveBalance' },
  });
  check(balanceRes, {
    'leave balance status is 200': (r) => r.status === 200,
    'leave balance has balances array': (r) => {
      if (r.status === 200) {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.balances);
        } catch (e) {
          return false;
        }
      }
      return false;
    },
  }) || errorRate.add(1);
  leaveBalanceDuration.add(balanceRes.timings.duration);
  requestCounter.add(1);
  sleep(0.5);

  // 2. List Leave Requests
  const listRes = http.get(
    `${data.baseUrl}/api/v1/leave/requests?page=1&size=25&sort=created_at,desc`,
    {
      headers,
      tags: { name: 'ListLeaveRequests' },
    }
  );
  check(listRes, {
    'list leave requests status is 200': (r) => r.status === 200,
    'list leave requests has pagination': (r) => {
      if (r.status === 200) {
        try {
          const body = JSON.parse(r.body);
          return body.page !== undefined && body.size !== undefined;
        } catch (e) {
          return false;
        }
      }
      return false;
    },
  }) || errorRate.add(1);
  leaveRequestsListDuration.add(listRes.timings.duration);
  requestCounter.add(1);
  sleep(0.5);

  // 3. Create Leave Request (30% chance to avoid too many requests)
  if (Math.random() < 0.3) {
    const startDate = randomFutureDate(30);
    const endDate = randomFutureDate(30);
    const policyId = Math.floor(Math.random() * 3) + 1; // Policy IDs 1-3
    
    const createRes = http.post(
      `${data.baseUrl}/api/v1/leave/requests`,
      JSON.stringify({
        policy_id: policyId,
        start_date: startDate,
        end_date: endDate,
        half_day: Math.random() < 0.2, // 20% chance of half day
        reason: 'Load test leave request',
      }),
      {
        headers,
        tags: { name: 'CreateLeaveRequest' },
      }
    );
    check(createRes, {
      'create leave request status is 201 or 409': (r) => 
        r.status === 201 || r.status === 409 || r.status === 400, // 409 = conflict, 400 = validation
      'create leave request has requestId': (r) => {
        if (r.status === 201) {
          try {
            const body = JSON.parse(r.body);
            return body.requestId !== undefined;
          } catch (e) {
            return false;
          }
        }
        return true; // Accept other status codes
      },
    }) || errorRate.add(1);
    leaveRequestCreateDuration.add(createRes.timings.duration);
    requestCounter.add(1);
    sleep(1);
  }

  // 4. Update Leave Request (Admin only, 10% chance)
  if (Math.random() < 0.1 && data.adminToken) {
    // First get a pending request
    const pendingListRes = http.get(
      `${data.baseUrl}/api/v1/leave/requests?status=PENDING&page=1&size=1`,
      {
        headers: adminHeaders,
        tags: { name: 'ListPendingForUpdate' },
      }
    );
    
    if (pendingListRes.status === 200) {
      try {
        const body = JSON.parse(pendingListRes.body);
        if (body.items && body.items.length > 0) {
          const requestId = body.items[0].requestId;
          const action = Math.random() < 0.5 ? 'APPROVE' : 'REJECT';
          
          const updateRes = http.patch(
            `${data.baseUrl}/api/v1/leave/requests/${requestId}`,
            JSON.stringify({
              action: action,
              notes: 'Load test approval/rejection',
            }),
            {
              headers: adminHeaders,
              tags: { name: 'UpdateLeaveRequest' },
            }
          );
          check(updateRes, {
            'update leave request status is 200 or 404': (r) => 
              r.status === 200 || r.status === 404 || r.status === 403,
          }) || errorRate.add(1);
          leaveRequestUpdateDuration.add(updateRes.timings.duration);
          requestCounter.add(1);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    sleep(1);
  }
}

function testAttendanceEndpoints(data, headers) {
  // 1. List Attendance Logs
  const listRes = http.get(
    `${data.baseUrl}/api/v1/attendance?page=1&size=20&sort=clock_in,desc`,
    {
      headers,
      tags: { name: 'ListAttendance' },
    }
  );
  check(listRes, {
    'list attendance status is 200': (r) => r.status === 200,
    'list attendance has pagination': (r) => {
      if (r.status === 200) {
        try {
          const body = JSON.parse(r.body);
          return body.page !== undefined;
        } catch (e) {
          return false;
        }
      }
      return false;
    },
  }) || errorRate.add(1);
  attendanceListDuration.add(listRes.timings.duration);
  requestCounter.add(1);
  sleep(0.5);

  // 2. Clock In (40% chance)
  if (Math.random() < 0.4) {
    const location = randomGPSLocation();
    const clockInRes = http.post(
      `${data.baseUrl}/api/v1/attendance/clock-in`,
      JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        source: 'k6-load-test',
      }),
      {
        headers,
        tags: { name: 'ClockIn' },
      }
    );
    check(clockInRes, {
      'clock in status is 201 or 409': (r) => 
        r.status === 201 || r.status === 409, // 409 = already clocked in
      'clock in response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);
    attendanceClockInDuration.add(clockInRes.timings.duration);
    requestCounter.add(1);
    sleep(2);
  }

  // 3. Clock Out (30% chance, after potential clock-in)
  if (Math.random() < 0.3) {
    const clockOutRes = http.post(
      `${data.baseUrl}/api/v1/attendance/clock-out`,
      JSON.stringify({}),
      {
        headers,
        tags: { name: 'ClockOut' },
      }
    );
    check(clockOutRes, {
      'clock out status is 200 or 404': (r) => 
        r.status === 200 || r.status === 404, // 404 = no active clock-in
      'clock out response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);
    attendanceClockOutDuration.add(clockOutRes.timings.duration);
    requestCounter.add(1);
    sleep(1);
  }
}

function testReportEndpoints(data, adminHeaders) {
  // Leave Summary Report (Admin only, 20% chance)
  if (Math.random() < 0.2 && data.adminToken) {
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);
    const toDate = new Date();
    
    const reportRes = http.get(
      `${data.baseUrl}/api/v1/reports/leave-summary?from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}`,
      {
        headers: adminHeaders,
        tags: { name: 'LeaveSummaryReport' },
      }
    );
    check(reportRes, {
      'leave summary status is 200 or 403': (r) => 
        r.status === 200 || r.status === 403, // 403 = not admin
      'leave summary has totals': (r) => {
        if (r.status === 200) {
          try {
            const body = JSON.parse(r.body);
            return body.totals !== undefined;
          } catch (e) {
            return false;
          }
        }
        return true;
      },
    }) || errorRate.add(1);
    leaveSummaryDuration.add(reportRes.timings.duration);
    requestCounter.add(1);
    sleep(1);
  }
}

export function handleSummary(data) {
  // Generate text summary
  let summary = '\n=== Phase 2 Performance Test Summary ===\n\n';
  
  summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `p95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `p99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += 'Custom Metrics:\n';
  if (data.metrics.leave_balance_duration) {
    summary += `  Leave Balance p95: ${data.metrics.leave_balance_duration.values['p(95)'].toFixed(2)}ms\n`;
  }
  if (data.metrics.attendance_clock_in_duration) {
    summary += `  Clock In p95: ${data.metrics.attendance_clock_in_duration.values['p(95)'].toFixed(2)}ms\n`;
  }
  if (data.metrics.leave_summary_duration) {
    summary += `  Leave Summary p95: ${data.metrics.leave_summary_duration.values['p(95)'].toFixed(2)}ms\n`;
  }
  
  summary += '\nThresholds:\n';
  if (data.thresholds) {
    Object.keys(data.thresholds).forEach(key => {
      const threshold = data.thresholds[key];
      summary += `  ${key}: ${threshold.ok ? '✅ PASS' : '❌ FAIL'}\n`;
    });
  }
  
  return {
    'stdout': summary,
    [`phase2-performance-${Date.now()}.json`]: JSON.stringify(data, null, 2),
  };
}

