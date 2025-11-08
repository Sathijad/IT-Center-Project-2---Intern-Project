import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const attendanceClockInDuration = new Trend('attendance_clock_in_duration');
const attendanceClockOutDuration = new Trend('attendance_clock_out_duration');
const getAttendanceDuration = new Trend('get_attendance_duration');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users (target RPS)
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300'],  // 95% of requests must complete below 300ms
    'errors': ['rate<0.01'],              // Error rate must be less than 1%
    'attendance_clock_in_duration': ['p(95)<300'],
    'attendance_clock_out_duration': ['p(95)<300'],
    'get_attendance_duration': ['p(95)<300'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';

export function setup() {
  // Setup: Get access token if not provided
  if (!ACCESS_TOKEN) {
    console.log('Warning: ACCESS_TOKEN not provided. Some tests may fail.');
  }
  
  return {
    accessToken: ACCESS_TOKEN,
    baseUrl: BASE_URL,
  };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.accessToken}`,
  };

  // Test 1: Get attendance logs
  const getAttendanceStart = Date.now();
  const getAttendanceRes = http.get(`${data.baseUrl}/api/v1/attendance?page=1&size=20`, {
    headers,
    tags: { name: 'GetAttendance' },
  });
  const getAttendanceDuration = Date.now() - getAttendanceStart;
  
  check(getAttendanceRes, {
    'get attendance status is 200': (r) => r.status === 200,
    'get attendance response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
  
  getAttendanceDuration.add(getAttendanceDuration);
  sleep(1);

  // Test 2: Clock in
  const clockInStart = Date.now();
  const clockInRes = http.post(`${data.baseUrl}/api/v1/attendance/clock-in`, 
    JSON.stringify({
      latitude: -37.8136 + (Math.random() * 0.01 - 0.005), // Slight variation
      longitude: 144.9631 + (Math.random() * 0.01 - 0.005),
      source: 'load-test',
    }),
    {
      headers,
      tags: { name: 'ClockIn' },
    }
  );
  const clockInDuration = Date.now() - clockInStart;
  
  check(clockInRes, {
    'clock in status is 201': (r) => r.status === 201 || r.status === 409, // 409 if already clocked in
    'clock in response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
  
  attendanceClockInDuration.add(clockInDuration);
  sleep(2);

  // Test 3: Clock out
  const clockOutStart = Date.now();
  const clockOutRes = http.post(`${data.baseUrl}/api/v1/attendance/clock-out`,
    JSON.stringify({}),
    {
      headers,
      tags: { name: 'ClockOut' },
    }
  );
  const clockOutDuration = Date.now() - clockOutStart;
  
  check(clockOutRes, {
    'clock out status is 200 or 404': (r) => r.status === 200 || r.status === 404, // 404 if no active clock-in
    'clock out response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
  
  attendanceClockOutDuration.add(clockOutDuration);
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'attendance-load-test-report.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  let summary = '\n=== Attendance Load Test Summary ===\n\n';
  
  summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `p95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `p99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += 'Thresholds:\n';
  data.thresholds && Object.keys(data.thresholds).forEach(key => {
    const threshold = data.thresholds[key];
    summary += `  ${key}: ${threshold.ok ? '✅ PASS' : '❌ FAIL'}\n`;
  });
  
  return summary;
}

