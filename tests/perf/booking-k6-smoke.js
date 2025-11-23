import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// ============================================================================
// Custom Metrics
// ============================================================================
const errorRate = new Rate('errors');

// ============================================================================
// Configuration - Smoke Test (Quick Validation)
// ============================================================================
export const options = {
  stages: [
    { duration: '10s', target: 1 },   // Start with 1 VU
    { duration: '20s', target: 5 },   // Ramp to 5 VUs
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // p95 < 1s for smoke test
    http_req_failed: ['rate<0.05'],     // < 5% failed requests
    errors: ['rate<0.05'],               // < 5% errors
  },
};

// ============================================================================
// Test Data
// ============================================================================
const BASE_URL = __ENV.API_BASE_URL || 'https://placeholder.execute-api.ap-southeast-2.amazonaws.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || __ENV.EMPLOYEE_TOKEN || '';

// ============================================================================
// Helper Functions
// ============================================================================

function getHeaders() {
  return {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function getFutureDateTime(hoursFromNow = 2) {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}

function generateIdempotencyKey() {
  return `k6-smoke-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function parseJSON(response) {
  try {
    return JSON.parse(response.body);
  } catch (e) {
    return null;
  }
}

// ============================================================================
// Main Test Function
// ============================================================================

export default function () {
  const headers = getHeaders();
  
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/healthz`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });
  errorRate.add(healthRes.status !== 200);
  sleep(1);
  
  // 2. List rooms
  const roomsRes = http.get(`${BASE_URL}/api/v1/rooms?active=true`, { headers });
  const roomsCheck = check(roomsRes, {
    'rooms list status is 200': (r) => r.status === 200,
    'rooms list has data': (r) => {
      const body = parseJSON(r);
      return body && body.rooms && Array.isArray(body.rooms) && body.rooms.length > 0;
    },
  });
  errorRate.add(!roomsCheck);
  sleep(1);
  
  // 3. Get room availability (if rooms exist)
  if (roomsRes.status === 200) {
    const rooms = parseJSON(roomsRes);
    if (rooms && rooms.rooms && rooms.rooms.length > 0) {
      const roomId = rooms.rooms[0].id;
      const start = getFutureDateTime(1);
      const end = getFutureDateTime(25);
      
      const availabilityRes = http.get(
        `${BASE_URL}/api/v1/rooms/${roomId}/availability?start=${start}&end=${end}`,
        { headers }
      );
      check(availabilityRes, {
        'availability status is 200': (r) => r.status === 200,
      });
      errorRate.add(availabilityRes.status !== 200);
      sleep(1);
    }
  }
  
  // 4. List bookings
  const bookingsRes = http.get(`${BASE_URL}/api/v1/bookings`, { headers });
  check(bookingsRes, {
    'bookings list status is 200': (r) => r.status === 200,
  });
  errorRate.add(bookingsRes.status !== 200);
  sleep(1);
}

// ============================================================================
// Setup
// ============================================================================

export function setup() {
  console.log('Running smoke test...');
  console.log(`Base URL: ${BASE_URL}`);
  
  const healthRes = http.get(`${BASE_URL}/healthz`);
  if (healthRes.status !== 200) {
    console.error(`Health check failed: ${healthRes.status}`);
    return { healthCheckPassed: false };
  }
  
  console.log('Health check passed');
  return { healthCheckPassed: true };
}

