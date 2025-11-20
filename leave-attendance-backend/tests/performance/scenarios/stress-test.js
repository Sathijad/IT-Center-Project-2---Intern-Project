// Stress Test - Find breaking point
// Run: k6 run scenarios/stress-test.js --env API_BASE_URL=http://localhost:3000 --env ACCESS_TOKEN=<token>

import phase2Test from '../phase2-comprehensive-test.js';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 200 },  // Increase to 200
    { duration: '3m', target: 300 },  // Increase to 300
    { duration: '3m', target: 400 },  // Increase to 400
    { duration: '3m', target: 500 },  // Increase to 500
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],  // More lenient for stress test
    'errors': ['rate<0.05'],               // Allow 5% error rate
  },
};

export default phase2Test;

