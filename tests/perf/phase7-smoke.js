import http from 'k6/http';
import { check } from 'k6';

// Smoke test - minimal load to verify system works
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8086';
const EMPLOYEE_TOKEN = __ENV.EMPLOYEE_TOKEN || '';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

export default function () {
  const headers = {
    'Authorization': `Bearer ${EMPLOYEE_TOKEN || ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // 1. Health check
  const health = http.get(`${BASE_URL}/api/v1/healthz`);
  check(health, {
    'health check works': (r) => r.status === 200,
  });

  // 2. List feedback
  const list = http.get(`${BASE_URL}/api/v1/feedback?page=1&size=10`, { headers });
  check(list, {
    'list feedback works': (r) => r.status === 200,
  });

  // 3. Create feedback
  const feedback = http.post(
    `${BASE_URL}/api/v1/feedback`,
    JSON.stringify({
      title: 'Smoke Test Feedback',
      description: 'This is a smoke test to verify the API is working.',
      category: 'BUG',
      priority: 'LOW',
    }),
    { headers }
  );
  check(feedback, {
    'create feedback works': (r) => r.status === 201,
  });

  // 4. Get feedback detail (if created)
  if (feedback.status === 201) {
    try {
      const body = JSON.parse(feedback.body);
      const detail = http.get(`${BASE_URL}/api/v1/feedback/${body.feedback_id}`, { headers });
      check(detail, {
        'get feedback detail works': (r) => r.status === 200,
      });
    } catch (e) {
      // Ignore
    }
  }
}

