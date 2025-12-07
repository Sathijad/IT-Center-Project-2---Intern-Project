import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Load test - normal expected load
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 VUs
    { duration: '3m', target: 50 },   // Stay at 50 VUs (normal load)
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8086';
const EMPLOYEE_TOKEN = __ENV.EMPLOYEE_TOKEN || '';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

function generateFeedbackData() {
  const categories = ['BUG', 'FEATURE', 'IMPROVEMENT', 'QUESTION'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH'];
  return {
    title: `Load Test Feedback ${Date.now()}`,
    description: 'Load test feedback description for performance testing',
    category: categories[Math.floor(Math.random() * categories.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
  };
}

export default function () {
  const headers = {
    'Authorization': `Bearer ${EMPLOYEE_TOKEN || ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // 1. List feedback (most common operation)
  const listRes = http.get(`${BASE_URL}/api/v1/feedback?page=1&size=20`, { headers });
  const listCheck = check(listRes, {
    'list feedback status 200': (r) => r.status === 200,
  });
  errorRate.add(!listCheck);
  sleep(1);

  // 2. Create feedback (30% of the time)
  if (Math.random() < 0.3) {
    const createRes = http.post(
      `${BASE_URL}/api/v1/feedback`,
      JSON.stringify(generateFeedbackData()),
      { headers }
    );
    const createCheck = check(createRes, {
      'create feedback status 201': (r) => r.status === 201,
    });
    errorRate.add(!createCheck);
    sleep(1);

    // 3. Get detail if created
    if (createRes.status === 201) {
      try {
        const body = JSON.parse(createRes.body);
        const detailRes = http.get(`${BASE_URL}/api/v1/feedback/${body.feedback_id}`, { headers });
        check(detailRes, {
          'get detail status 200': (r) => r.status === 200,
        });
        sleep(1);
      } catch (e) {
        errorRate.add(1);
      }
    }
  }
}

