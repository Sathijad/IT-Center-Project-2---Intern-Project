// Spike Test - Sudden traffic spikes
// Run: k6 run scenarios/spike-test.js --env API_BASE_URL=http://localhost:3000 --env ACCESS_TOKEN=<token>

import phase2Test from '../phase2-comprehensive-test.js';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Normal load
    { duration: '30s', target: 500 }, // Sudden spike to 500
    { duration: '1m', target: 500 },  // Hold spike
    { duration: '30s', target: 50 },  // Drop back
    { duration: '1m', target: 50 },   // Normal load
    { duration: '30s', target: 300 }, // Another spike
    { duration: '1m', target: 300 },  // Hold
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],  // More lenient for spikes
    'errors': ['rate<0.1'],               // Allow 10% error rate during spikes
  },
};

export default phase2Test;

