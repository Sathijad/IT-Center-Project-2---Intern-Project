/**
 * k6 Performance Test: Performance CRUD Operations
 * Tests POST/GET operations for KPIs, Targets, and Actuals
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { config } from '../config.js';
import { getAuthToken, createAuthHeaders } from '../helpers/auth.js';
import {
  generateCreateKpiRequest,
  generateCreateTargetRequest,
  generateCreateActualRequest,
} from '../helpers/data.js';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 5 },  // Ramp up
    { duration: '3m', target: 5 },  // Stay at 5 VUs
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.1'],
  },
};

export function setup() {
  const token = getAuthToken(config.baseUrl);
  return { token };
}

export default function (data) {
  const { token } = data;
  const baseUrl = config.baseUrl;
  const headers = createAuthHeaders(token);

  // Test 1: Create KPI
  const kpiPayload = JSON.stringify(generateCreateKpiRequest());
  let response = http.post(`${baseUrl}/api/v1/perf/kpis`, kpiPayload, headers);
  let success = check(response, {
    'create KPI status is 201': (r) => r.status === 201,
    'create KPI has kpiId': (r) => r.json('kpiId') !== undefined,
    'create KPI response time < 800ms': (r) => r.timings.duration < 800,
  });
  errorRate.add(!success);
  
  if (!success || response.status !== 201) {
    sleep(1);
    return;
  }
  
  const kpiId = response.json('kpiId');
  sleep(1);

  // Test 2: Get KPI by ID
  response = http.get(`${baseUrl}/api/v1/perf/kpis/${kpiId}`, headers);
  success = check(response, {
    'get KPI by ID status is 200': (r) => r.status === 200,
    'get KPI by ID has correct kpiId': (r) => r.json('kpiId') === kpiId,
    'get KPI by ID response time < 300ms': (r) => r.timings.duration < 300,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 3: Create KPI Target
  const targetPayload = JSON.stringify(generateCreateTargetRequest(kpiId));
  response = http.post(`${baseUrl}/api/v1/perf/targets`, targetPayload, headers);
  success = check(response, {
    'create target status is 201': (r) => r.status === 201,
    'create target has targetId': (r) => r.json('targetId') !== undefined,
    'create target response time < 800ms': (r) => r.timings.duration < 800,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 4: Create KPI Actual
  const actualPayload = JSON.stringify(generateCreateActualRequest(kpiId));
  response = http.post(`${baseUrl}/api/v1/perf/actuals`, actualPayload, headers);
  success = check(response, {
    'create actual status is 201': (r) => r.status === 201,
    'create actual has actualId': (r) => r.json('actualId') !== undefined,
    'create actual response time < 800ms': (r) => r.timings.duration < 800,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 5: Get my actuals
  response = http.get(`${baseUrl}/api/v1/perf/actuals/my`, headers);
  success = check(response, {
    'get my actuals status is 200': (r) => r.status === 200,
    'get my actuals has data': (r) => Array.isArray(r.json()),
    'get my actuals response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!success);
  sleep(1);
}

