/**
 * k6 Performance Testing Configuration for Phase 6
 * Performance & Training Module API Load Tests
 */

export const config = {
  // Base URL for the API
  baseUrl: __ENV.BASE_URL || 'http://localhost:5167',
  
  // Test scenarios
  scenarios: {
    // Smoke test - minimal load to verify system works
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    
    // Load test - normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },  // Ramp up to 10 users
        { duration: '5m', target: 10 },  // Stay at 10 users
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'load' },
    },
    
    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up to 20 users
        { duration: '5m', target: 20 },  // Stay at 20 users
        { duration: '2m', target: 30 },  // Increase to 30 users
        { duration: '5m', target: 30 },  // Stay at 30 users
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'stress' },
    },
    
    // Spike test - sudden increase in load
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },  // Normal load
        { duration: '30s', target: 50 }, // Sudden spike
        { duration: '1m', target: 50 },   // Stay at spike
        { duration: '1m', target: 10 },  // Back to normal
        { duration: '1m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'spike' },
    },
    
    // Soak test - sustained load over time
    soak: {
      executor: 'constant-arrival-rate',
      rate: 5, // 5 requests per second
      timeUnit: '1s',
      duration: '30m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      tags: { test_type: 'soak' },
    },
  },
  
  // Thresholds for pass/fail criteria
  thresholds: {
    // HTTP-specific thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    http_reqs: ['rate>10'], // At least 10 requests per second
    
    // Iteration thresholds
    iteration_duration: ['p(95)<2000'], // 95% of iterations < 2s
    
    // Custom metrics
    'checks{check_type:status}': ['rate>0.95'], // 95% status checks pass
    'checks{check_type:response_time}': ['rate>0.90'], // 90% response time checks pass
  },
  
  // Summary time unit
  summaryTimeUnit: 'ms',
  
  // Summary trend stats
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

/**
 * Get authentication token
 * Note: In real scenarios, you would authenticate and get a JWT token
 * For testing, you may need to set up test users and authenticate
 */
export function getAuthToken() {
  // This should be replaced with actual authentication logic
  // For now, return a token from environment variable or mock
  return __ENV.AUTH_TOKEN || 'your-jwt-token-here';
}

/**
 * Common HTTP request options
 */
export function getHttpOptions(token) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    tags: {
      name: 'api_request',
    },
  };
}

/**
 * Generate random GUID
 */
export function generateGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate random date in ISO format
 */
export function randomDate(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime).toISOString();
}

/**
 * Sleep for specified duration
 */
export function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

