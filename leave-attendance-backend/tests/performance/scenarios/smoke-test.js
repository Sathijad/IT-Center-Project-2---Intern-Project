// Smoke Test - Quick validation that all endpoints are working
// Run: k6 run scenarios/smoke-test.js --env API_BASE_URL=http://localhost:3000 --env ACCESS_TOKEN=<token>

import phase2Test from '../phase2-comprehensive-test.js';

export const options = {
  stages: [
    { duration: '1m', target: 1 },  // Single user for 1 minute
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],  // More lenient for smoke test
    'errors': ['rate<0.05'],              // Allow 5% error rate for smoke
  },
};

export default phase2Test;

