import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up
    { duration: '1m', target: 100 },  // Stay at 100 VU
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // p95 < 300ms
    errors: ['rate<0.01'],             // < 1% errors
    http_req_failed: ['rate<0.01'],    // < 1% failed requests
  },
};

// Test data
const BASE_URL = __ENV.API_BASE_URL || 'https://placeholder.execute-api.ap-southeast-2.amazonaws.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Test 1: List rooms
  const roomsRes = http.get(`${BASE_URL}/api/v1/rooms`, { headers });
  const roomsCheck = check(roomsRes, {
    'rooms list status 200': (r) => r.status === 200,
    'rooms list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.rooms && Array.isArray(body.rooms);
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!roomsCheck);
  sleep(1);

  // Test 2: Get room availability
  if (roomsRes.status === 200) {
    try {
      const rooms = JSON.parse(roomsRes.body).rooms;
      if (rooms && rooms.length > 0) {
        const roomId = rooms[0].id;
        const start = new Date().toISOString();
        const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        const availabilityRes = http.get(
          `${BASE_URL}/api/v1/rooms/${roomId}/availability?start=${start}&end=${end}`,
          { headers }
        );
        const availabilityCheck = check(availabilityRes, {
          'availability status 200': (r) => r.status === 200,
        });
        errorRate.add(!availabilityCheck);
        sleep(1);
      }
    } catch (e) {
      errorRate.add(1);
    }
  }

  // Test 3: Create booking (with idempotency)
  if (roomsRes.status === 200) {
    try {
      const rooms = JSON.parse(roomsRes.body).rooms;
      if (rooms && rooms.length > 0) {
        const roomId = rooms[0].id;
        const start = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
        const end = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();   // 3 hours from now
        const idempotencyKey = `k6-test-${Date.now()}-${Math.random()}`;

        const bookingRes = http.post(
          `${BASE_URL}/api/v1/bookings`,
          JSON.stringify({
            room_id: roomId,
            start_ts: start,
            end_ts: end,
            title: 'K6 Performance Test Booking',
          }),
          {
            headers: {
              ...headers,
              'Idempotency-Key': idempotencyKey,
            },
          }
        );

        const bookingCheck = check(bookingRes, {
          'booking create status 200 or 201': (r) => r.status === 200 || r.status === 201,
        });
        errorRate.add(!bookingCheck);
        sleep(1);
      }
    } catch (e) {
      errorRate.add(1);
    }
  }

  // Test 4: List bookings
  const bookingsRes = http.get(`${BASE_URL}/api/v1/bookings`, { headers });
  const bookingsCheck = check(bookingsRes, {
    'bookings list status 200': (r) => r.status === 200,
  });
  errorRate.add(!bookingsCheck);
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    'booking-perf-results.json': JSON.stringify(data, null, 2),
  };
}

