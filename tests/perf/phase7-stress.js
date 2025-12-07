import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Stress test - push system to limits
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Ramp up to 50 VUs
    { duration: '2m', target: 100 },   // Ramp up to 100 VUs
    { duration: '2m', target: 200 },   // Ramp up to 200 VUs
    { duration: '2m', target: 300 },   // Ramp up to 300 VUs
    { duration: '2m', target: 200 },   // Ramp down to 200 VUs
    { duration: '1m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // More lenient for stress test
    http_req_failed: ['rate<0.05'],    // Allow up to 5% failures
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8086';
const EMPLOYEE_TOKEN = __ENV.EMPLOYEE_TOKEN || '';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

function generateFeedbackData() {
  const categories = ['BUG', 'FEATURE', 'IMPROVEMENT', 'QUESTION'];
  return {
    title: `Stress Test Feedback ${Date.now()}-${Math.random()}`,
    description: 'Stress test feedback description',
    category: categories[Math.floor(Math.random() * categories.length)],
    priority: 'MEDIUM',
  };
}

export default function () {
  const headers = {
    'Authorization': `Bearer ${EMPLOYEE_TOKEN || ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Mix of operations
  const operations = [
    () => {
      // List feedback
      const res = http.get(`${BASE_URL}/api/v1/feedback?page=1&size=20`, { headers });
      const checkResult = check(res, {
        'list status 200': (r) => r.status === 200,
      });
      errorRate.add(!checkResult);
    },
    () => {
      // Create feedback
      const res = http.post(
        `${BASE_URL}/api/v1/feedback`,
        JSON.stringify(generateFeedbackData()),
        { headers }
      );
      const checkResult = check(res, {
        'create status 201': (r) => r.status === 201,
      });
      errorRate.add(!checkResult);
    },
    () => {
      // Health check
      const res = http.get(`${BASE_URL}/api/v1/healthz`);
      const checkResult = check(res, {
        'health status 200': (r) => r.status === 200,
      });
      errorRate.add(!checkResult);
    },
  ];

  // Randomly pick an operation
  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();
  
  sleep(0.5);
}

