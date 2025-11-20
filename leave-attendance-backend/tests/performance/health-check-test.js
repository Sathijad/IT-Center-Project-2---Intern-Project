// Simple health check test - No authentication required
// Run: k6 run health-check-test.js --env API_BASE_URL=http://localhost:3000

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'],  // Health checks should be reasonably fast
    'http_req_failed': ['rate<0.01'],    // < 1% errors
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

export default function () {
  // Health check endpoint (no auth required)
  const res = http.get(`${BASE_URL}/healthz`, {
    tags: { name: 'HealthCheck' },
  });

  check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
    'health check has status field': (r) => {
      if (r.status === 200) {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch (e) {
          return false;
        }
      }
      return false;
    },
  });

  sleep(1);
}

export function handleSummary(data) {
  let summary = '\n=== Health Check Test Summary ===\n\n';
  
  const httpReqs = data.metrics.http_reqs && data.metrics.http_reqs.values ? data.metrics.http_reqs.values.count : 0;
  const failedRate = data.metrics.http_req_failed && data.metrics.http_req_failed.values ? data.metrics.http_req_failed.values.rate : 0;
  const duration = data.metrics.http_req_duration && data.metrics.http_req_duration.values ? data.metrics.http_req_duration.values : null;
  
  summary += `Total Requests: ${httpReqs}\n`;
  summary += `Failed Requests: ${(failedRate * 100).toFixed(2)}%\n`;
  
  if (duration) {
    summary += `Average Response Time: ${duration.avg ? duration.avg.toFixed(2) : 'N/A'}ms\n`;
    summary += `p95 Response Time: ${duration['p(95)'] ? duration['p(95)'].toFixed(2) : 'N/A'}ms\n`;
    summary += `p99 Response Time: ${duration['p(99)'] ? duration['p(99)'].toFixed(2) : 'N/A'}ms\n`;
  }
  summary += '\n';
  
  summary += 'Thresholds:\n';
  if (data.thresholds) {
    Object.keys(data.thresholds).forEach(key => {
      const threshold = data.thresholds[key];
      summary += `  ${key}: ${threshold.ok ? '✅ PASS' : '❌ FAIL'}\n`;
    });
  }
  
  return {
    'stdout': summary,
    [`health-check-${Date.now()}.json`]: JSON.stringify(data, null, 2),
  };
}

