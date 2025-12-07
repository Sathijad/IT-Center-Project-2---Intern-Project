import http from 'k6/http';
import { check } from 'k6';

// Health check only test - no authentication required
export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8086';

export default function () {
  const health = http.get(`${BASE_URL}/api/v1/healthz`);
  
  check(health, {
    'health check status is 200': (r) => r.status === 200,
    'health check has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch (e) {
        return false;
      }
    },
    'health check has database field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.database !== undefined;
      } catch (e) {
        return false;
      }
    },
    'health check has timestamp': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.timestamp !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    'phase7-health-results.json': JSON.stringify(data, null, 2),
  };
}

