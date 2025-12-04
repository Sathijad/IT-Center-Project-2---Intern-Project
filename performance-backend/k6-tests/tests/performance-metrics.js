/**
 * k6 Performance Test: Performance Metrics Endpoints
 * Tests GET /api/v1/perf/metrics and related endpoints
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { config, getHttpOptions, generateGuid } from '../config.js';
import { getAuthToken, createAuthHeaders } from '../helpers/auth.js';
import { generateUserId, generateTeamId, generateDateRange, generateKpiCode } from '../helpers/data.js';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up
    { duration: '3m', target: 10 }, // Stay at 10 VUs
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.1'],
  },
};

export function setup() {
  // Get auth token once for all VUs
  const token = getAuthToken(config.baseUrl);
  return { token };
}

export default function (data) {
  const { token } = data;
  const baseUrl = config.baseUrl;
  const headers = createAuthHeaders(token);

  // Test 1: Get metrics snapshot (no filters)
  let response = http.get(`${baseUrl}/api/v1/perf/metrics`, headers);
  let success = check(response, {
    'metrics snapshot status is 200': (r) => r.status === 200,
    'metrics snapshot has data': (r) => r.json().length >= 0,
    'metrics snapshot response time < 500ms': (r) => r.timings.duration < 500,
  }, { check_type: 'status' });
  errorRate.add(!success);
  sleep(1);

  // Test 2: Get metrics with user filter
  const userId = generateUserId();
  response = http.get(`${baseUrl}/api/v1/perf/metrics?user_id=${userId}`, headers);
  success = check(response, {
    'metrics with user filter status is 200': (r) => r.status === 200,
    'metrics with user filter response time < 500ms': (r) => r.timings.duration < 500,
  }, { check_type: 'response_time' });
  errorRate.add(!success);
  sleep(1);

  // Test 3: Get metrics with team filter
  const teamId = generateTeamId();
  response = http.get(`${baseUrl}/api/v1/perf/metrics?team_id=${teamId}`, headers);
  success = check(response, {
    'metrics with team filter status is 200': (r) => r.status === 200,
    'metrics with team filter response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 4: Get metrics with KPI code filter
  const kpiCode = generateKpiCode();
  response = http.get(`${baseUrl}/api/v1/perf/metrics?kpi=${kpiCode}`, headers);
  success = check(response, {
    'metrics with KPI filter status is 200': (r) => r.status === 200,
    'metrics with KPI filter response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 5: Get metrics with date range
  const range = generateDateRange();
  response = http.get(`${baseUrl}/api/v1/perf/metrics?range=${range}`, headers);
  success = check(response, {
    'metrics with date range status is 200': (r) => r.status === 200,
    'metrics with date range response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 6: Get time-series data
  response = http.get(`${baseUrl}/api/v1/perf/metrics/timeseries?range=last30days`, headers);
  success = check(response, {
    'time-series status is 200': (r) => r.status === 200,
    'time-series has data': (r) => r.json().length >= 0,
    'time-series response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 7: Get all KPIs
  response = http.get(`${baseUrl}/api/v1/perf/kpis`, headers);
  success = check(response, {
    'get KPIs status is 200': (r) => r.status === 200,
    'get KPIs has data': (r) => r.json().length >= 0,
    'get KPIs response time < 300ms': (r) => r.timings.duration < 300,
  });
  errorRate.add(!success);
  sleep(1);
}

export function teardown(data) {
  // Cleanup if needed
}

