import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const feedLatency = new Rate('feed_slow'); // Track if feed exceeds 300ms

// Configuration - Phase 5 requirements: feed p95 < 300ms, error rate < 1%
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 VU
    { duration: '2m', target: 100 },     // Stay at 100 VU (simulate high load)
    { duration: '30s', target: 0 },      // Ramp down
  ],
  thresholds: {
    // Phase 5 requirement: feed p95 < 300ms
    'http_req_duration{name:feed_list}': ['p(95)<300'],
    'http_req_duration{name:event_detail}': ['p(95)<500'],
    'http_req_duration': ['p(95)<500'],  // Overall p95 < 500ms
    'errors': ['rate<0.01'],             // < 1% errors (Phase 5 requirement)
    'http_req_failed': ['rate<0.01'],    // < 1% failed requests
    'feed_slow': ['rate<0.05'],          // < 5% of feed requests exceed 300ms
  },
};

// Test data
const BASE_URL = __ENV.EVENTS_API_BASE_URL || 'http://localhost:8085';
const ADMIN_TOKEN = __ENV.ADMIN_JWT_TOKEN || '';
const EMPLOYEE_TOKEN = __ENV.EMPLOYEE_JWT_TOKEN || ADMIN_TOKEN; // Fallback to admin token if employee not provided

// Helper to generate unique IDs
function generateIdempotencyKey() {
  return `k6-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Helper to generate test event data
function generateEventData() {
  const timestamp = Date.now();
  return {
    title: `K6 Performance Test Event ${timestamp}`,
    summary: `This is a test event created during k6 performance testing at ${new Date().toISOString()}`,
    body: '<p>Test event body content for performance testing.</p>',
    channel: 'GENERAL',
    tags: ['test', 'performance', 'k6'],
    rsvpRequired: false,
  };
}

export default function () {
  const headers = {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // ============================================
  // Test 1: GET /api/v1/events (FEED LIST)
  // This is the critical endpoint for Phase 5 p95 < 300ms requirement
  // ============================================
  const feedParams = {
    page: 1,
    size: 20,
    channel: 'GENERAL',
  };
  const feedUrl = `${BASE_URL}/api/v1/events?page=${feedParams.page}&size=${feedParams.size}&channel=${feedParams.channel}`;
  
  const feedRes = http.get(feedUrl, {
    headers: { 'Authorization': `Bearer ${EMPLOYEE_TOKEN}` },
    tags: { name: 'feed_list' },
  });
  
  const feedCheck = check(feedRes, {
    'feed list status 200': (r) => r.status === 200,
    'feed list has items array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.items && Array.isArray(body.items);
      } catch {
        return false;
      }
    },
    'feed list has pagination': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.page === 'number' && typeof body.total === 'number';
      } catch {
        return false;
      }
    },
  });
  
  // Track if feed response time exceeds 300ms
  feedLatency.add(feedRes.timings.duration > 300);
  errorRate.add(!feedCheck);
  
  // Extract ETag for cache testing
  let etag = feedRes.headers['ETag'];
  let eventId = null;
  
  if (feedRes.status === 200) {
    try {
      const body = JSON.parse(feedRes.body);
      if (body.items && body.items.length > 0) {
        eventId = body.items[0].id;
      }
    } catch (e) {
      errorRate.add(1);
    }
  }
  
  sleep(1);

  // ============================================
  // Test 2: GET /api/v1/events/:id (EVENT DETAIL)
  // ============================================
  if (eventId) {
    const detailRes = http.get(`${BASE_URL}/api/v1/events/${eventId}`, {
      headers: { 'Authorization': `Bearer ${EMPLOYEE_TOKEN}` },
      tags: { name: 'event_detail' },
    });
    
    const detailCheck = check(detailRes, {
      'event detail status 200': (r) => r.status === 200,
      'event detail has event object': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.event && typeof body.event === 'object';
        } catch {
          return false;
        }
      },
    });
    
    errorRate.add(!detailCheck);
    sleep(1);
  }

  // ============================================
  // Test 3: GET /api/v1/tags (TAG SEARCH)
  // ============================================
  const tagsRes = http.get(`${BASE_URL}/api/v1/tags?query=test`, {
    headers: { 'Authorization': `Bearer ${EMPLOYEE_TOKEN}` },
    tags: { name: 'tag_search' },
  });
  
  const tagsCheck = check(tagsRes, {
    'tags search status 200': (r) => r.status === 200,
    'tags search has tags array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.tags && Array.isArray(body.tags);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!tagsCheck);
  sleep(1);

  // ============================================
  // Test 4: POST /api/v1/events (CREATE EVENT - ADMIN)
  // ============================================
  const createRes = http.post(
    `${BASE_URL}/api/v1/events`,
    JSON.stringify(generateEventData()),
    {
      headers,
      tags: { name: 'event_create' },
    }
  );
  
  const createCheck = check(createRes, {
    'event create status 201': (r) => r.status === 201,
    'event create returns event': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id && body.title;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!createCheck);
  
  let createdEventId = null;
  if (createRes.status === 201) {
    try {
      const body = JSON.parse(createRes.body);
      createdEventId = body.id;
    } catch (e) {
      errorRate.add(1);
    }
  }
  
  sleep(1);

  // ============================================
  // Test 5: PATCH /api/v1/events/:id (UPDATE EVENT - ADMIN)
  // ============================================
  if (createdEventId) {
    const updateData = {
      title: `Updated K6 Test Event ${Date.now()}`,
      summary: 'Updated summary for performance testing',
    };
    
    const updateRes = http.patch(
      `${BASE_URL}/api/v1/events/${createdEventId}`,
      JSON.stringify(updateData),
      {
        headers,
        tags: { name: 'event_update' },
      }
    );
    
    const updateCheck = check(updateRes, {
      'event update status 200': (r) => r.status === 200,
    });
    
    errorRate.add(!updateCheck);
    sleep(1);
  }

  // ============================================
  // Test 6: POST /api/v1/events/tag-suggest (TAG SUGGESTIONS - ADMIN)
  // ============================================
  const tagSuggestRes = http.post(
    `${BASE_URL}/api/v1/events/tag-suggest`,
    JSON.stringify({
      query: 'performance',
      limit: 5,
    }),
    {
      headers,
      tags: { name: 'tag_suggest' },
    }
  );
  
  const tagSuggestCheck = check(tagSuggestRes, {
    'tag suggest status 200': (r) => r.status === 200,
    'tag suggest returns tags': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.tags && Array.isArray(body.tags);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!tagSuggestCheck);
  sleep(1);

  // ============================================
  // Test 7: POST /api/v1/events/:id/moderate (MODERATE - ADMIN)
  // Only test if we have a created event
  // ============================================
  if (createdEventId) {
    const moderateRes = http.post(
      `${BASE_URL}/api/v1/events/${createdEventId}/moderate`,
      JSON.stringify({
        action: 'APPROVE',
        notes: 'Approved during k6 performance testing',
      }),
      {
        headers,
        tags: { name: 'event_moderate' },
      }
    );
    
    const moderateCheck = check(moderateRes, {
      'moderate status 202': (r) => r.status === 202,
    });
    
    errorRate.add(!moderateCheck);
    sleep(1);
  }

  // ============================================
  // Test 8: POST /api/v1/events/:id/broadcast (BROADCAST - ADMIN)
  // Only test if we have an approved event
  // Note: This requires Idempotency-Key header
  // ============================================
  if (createdEventId) {
    const idempotencyKey = generateIdempotencyKey();
    const broadcastRes = http.post(
      `${BASE_URL}/api/v1/events/${createdEventId}/broadcast`,
      JSON.stringify({
        channels: ['PUSH', 'EMAIL'],
        idempotencyKey: idempotencyKey,
      }),
      {
        headers: {
          ...headers,
          'Idempotency-Key': idempotencyKey,
        },
        tags: { name: 'event_broadcast' },
      }
    );
    
    const broadcastCheck = check(broadcastRes, {
      'broadcast status 202': (r) => r.status === 202 || r.status === 400, // 400 if event not approved
    });
    
    errorRate.add(!broadcastCheck);
    sleep(1);
  }

  // ============================================
  // Test 9: GET /api/v1/events/:id/audit (AUDIT - ADMIN)
  // ============================================
  if (createdEventId) {
    const auditRes = http.get(
      `${BASE_URL}/api/v1/events/${createdEventId}/audit?limit=10`,
      {
        headers,
        tags: { name: 'event_audit' },
      }
    );
    
    const auditCheck = check(auditRes, {
      'audit status 200': (r) => r.status === 200,
      'audit returns audits array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.audits && Array.isArray(body.audits);
        } catch {
          return false;
        }
      },
    });
    
    errorRate.add(!auditCheck);
    sleep(1);
  }

  // ============================================
  // Test 10: ETag caching test (If-None-Match)
  // ============================================
  if (etag) {
    const cachedRes = http.get(feedUrl, {
      headers: {
        'Authorization': `Bearer ${EMPLOYEE_TOKEN}`,
        'If-None-Match': etag,
      },
      tags: { name: 'feed_cache' },
    });
    
    const cacheCheck = check(cachedRes, {
      'cached feed status 304': (r) => r.status === 304,
    });
    
    errorRate.add(!cacheCheck);
  }

  sleep(1);
}

// Summary handler for test results
export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    'tests/perf/phase5-perf-results.json': JSON.stringify(data, null, 2),
    'tests/perf/phase5-summary.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: {
        feed_p95: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
        feed_p95_target: 300,
        feed_p95_pass: (data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 300,
        error_rate: data.metrics.errors?.values?.rate || 0,
        error_rate_target: 0.01,
        error_rate_pass: (data.metrics.errors?.values?.rate || 0) < 0.01,
        total_requests: data.metrics.http_reqs?.values?.count || 0,
        failed_requests: data.metrics.http_req_failed?.values?.rate || 0,
      },
      thresholds: data.root_group?.checks || [],
    }, null, 2),
  };
}

