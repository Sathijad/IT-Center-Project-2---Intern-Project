/**
 * k6 Smoke Test: Quick verification that system is working
 * Minimal load to verify basic functionality
 */

import http from 'k6/http';
import { check } from 'k6';
import { config } from '../config.js';
import { getAuthToken, createAuthHeaders } from '../helpers/auth.js';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
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

  // Test 1: Health check (if available)
  let response = http.get(`${baseUrl}/healthz`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Test 2: Get metrics
  response = http.get(`${baseUrl}/api/v1/perf/metrics`, headers);
  check(response, {
    'get metrics status is 200': (r) => r.status === 200,
  });

  // Test 3: Get KPIs
  response = http.get(`${baseUrl}/api/v1/perf/kpis`, headers);
  check(response, {
    'get KPIs status is 200': (r) => r.status === 200,
  });

  // Test 4: Get courses
  response = http.get(`${baseUrl}/api/v1/training/courses?page=1&size=10`, headers);
  check(response, {
    'get courses status is 200': (r) => r.status === 200,
  });
}

