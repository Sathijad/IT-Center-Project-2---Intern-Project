// Load Test - Normal expected load
// Run: k6 run scenarios/load-test.js --env API_BASE_URL=http://localhost:3000 --env ACCESS_TOKEN=<token>

import phase2Test from '../phase2-comprehensive-test.js';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<500'],
    'errors': ['rate<0.01'],  // < 1% error rate
  },
};

export default phase2Test;

