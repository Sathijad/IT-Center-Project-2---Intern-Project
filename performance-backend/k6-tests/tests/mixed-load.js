/**
 * k6 Performance Test: Mixed Load Scenario
 * Simulates realistic user behavior with mixed endpoint calls
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { config } from '../config.js';
import { getAuthToken, createAuthHeaders } from '../helpers/auth.js';
import {
  generateUserId,
  generateTeamId,
  generateDateRange,
  generateKpiCode,
} from '../helpers/data.js';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 15 },  // Ramp up to 15 VUs
    { duration: '5m', target: 15 },  // Stay at 15 VUs
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<600', 'p(99)<1200'],
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

  // Simulate user browsing KPIs (80% of traffic)
  if (Math.random() < 0.8) {
    // Get metrics snapshot
    let response = http.get(`${baseUrl}/api/v1/perf/metrics`, headers);
    check(response, {
      'browse metrics status is 200': (r) => r.status === 200,
    });
    sleep(2);

    // Get time-series for specific KPI
    const kpiCode = generateKpiCode();
    response = http.get(`${baseUrl}/api/v1/perf/metrics/timeseries?kpi=${kpiCode}&range=last30days`, headers);
    check(response, {
      'get time-series status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // Simulate user viewing training (15% of traffic)
  if (Math.random() < 0.15) {
    let response = http.get(`${baseUrl}/api/v1/training/courses?page=1&size=20`, headers);
    check(response, {
      'view courses status is 200': (r) => r.status === 200,
    });
    sleep(1);

    // Get assignments
    const userId = generateUserId();
    response = http.get(`${baseUrl}/api/v1/training/assignments?user_id=${userId}`, headers);
    check(response, {
      'view assignments status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // Simulate admin creating data (5% of traffic)
  if (Math.random() < 0.05) {
    // Get all KPIs first
    let response = http.get(`${baseUrl}/api/v1/perf/kpis`, headers);
    const kpis = response.json();
    
    if (kpis && kpis.length > 0) {
      const kpiId = kpis[Math.floor(Math.random() * kpis.length)].kpiId;
      
      // Create actual
      const actualPayload = JSON.stringify({
        kpiId: kpiId,
        userId: generateUserId(),
        measuredAt: new Date().toISOString(),
        value: Math.floor(Math.random() * 100) + 50,
      });
      
      response = http.post(`${baseUrl}/api/v1/perf/actuals`, actualPayload, headers);
      check(response, {
        'create actual status is 201': (r) => r.status === 201,
      });
      sleep(2);
    }
  }

  // Random sleep to simulate user think time
  sleep(Math.random() * 2 + 1);
}

