import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const feedbackCreateTime = new Trend('feedback_create_time');
const feedbackListTime = new Trend('feedback_list_time');
const feedbackDetailTime = new Trend('feedback_detail_time');
const messageAddTime = new Trend('message_add_time');

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 VUs
    { duration: '1m', target: 50 },     // Stay at 50 VUs
    { duration: '30s', target: 100 },   // Ramp up to 100 VUs
    { duration: '2m', target: 100 },    // Stay at 100 VUs
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.02'],                  // < 2% failed requests
    errors: ['rate<0.02'],                           // < 2% errors
    feedback_create_time: ['p(95)<600'],            // Feedback creation < 600ms
    feedback_list_time: ['p(95)<400'],              // List feedback < 400ms
    feedback_detail_time: ['p(95)<300'],            // Get detail < 300ms
    message_add_time: ['p(95)<400'],                // Add message < 400ms
  },
};

// Test configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8086';
const EMPLOYEE_TOKEN = __ENV.EMPLOYEE_TOKEN || '';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

// Test data generators
function generateFeedbackData() {
  const categories = ['BUG', 'FEATURE', 'IMPROVEMENT', 'QUESTION'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const titles = [
    'Application crashes on startup',
    'Feature request: Dark mode support',
    'Performance improvement needed',
    'Question about API usage',
    'Bug in login flow',
    'Request for new dashboard',
  ];
  
  return {
    title: titles[Math.floor(Math.random() * titles.length)],
    description: `This is a test feedback description generated at ${new Date().toISOString()}. It contains some sample text to test the feedback creation endpoint.`,
    category: categories[Math.floor(Math.random() * categories.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    labels: ['test', 'k6', 'performance'],
  };
}

function generateMessageContent() {
  const messages = [
    'This is a follow-up message from the performance test.',
    'Can you provide more details about this issue?',
    'Thank you for reporting this. We will look into it.',
    'I have the same issue. Any updates?',
    'This has been resolved in the latest version.',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Employee user flow
export function employeeFlow() {
  const headers = {
    'Authorization': `Bearer ${EMPLOYEE_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // 1. List own feedback
  const listStart = Date.now();
  const listRes = http.get(`${BASE_URL}/api/v1/feedback?page=1&size=20`, { headers });
  feedbackListTime.add(Date.now() - listStart);
  
  const listCheck = check(listRes, {
    'employee list feedback status 200': (r) => r.status === 200,
    'employee list has items array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.items && Array.isArray(body.items);
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!listCheck);
  sleep(1);

  // 2. Create new feedback
  if (EMPLOYEE_TOKEN) {
    const feedbackData = generateFeedbackData();
    const createStart = Date.now();
    const createRes = http.post(
      `${BASE_URL}/api/v1/feedback`,
      JSON.stringify(feedbackData),
      { headers }
    );
    feedbackCreateTime.add(Date.now() - createStart);
    
    const createCheck = check(createRes, {
      'employee create feedback status 201': (r) => r.status === 201,
      'employee create returns feedback_id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.feedback_id && typeof body.feedback_id === 'string';
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!createCheck);
    sleep(1);

    // 3. Get feedback details
    if (createRes.status === 201) {
      try {
        const feedback = JSON.parse(createRes.body);
        const feedbackId = feedback.feedback_id;
        
        const detailStart = Date.now();
        const detailRes = http.get(`${BASE_URL}/api/v1/feedback/${feedbackId}`, { headers });
        feedbackDetailTime.add(Date.now() - detailStart);
        
        const detailCheck = check(detailRes, {
          'employee get feedback detail status 200': (r) => r.status === 200,
        });
        errorRate.add(!detailCheck);
        sleep(1);

        // 4. Add message to feedback
        if (detailRes.status === 200) {
          const messageContent = generateMessageContent();
          const messageStart = Date.now();
          const messageRes = http.post(
            `${BASE_URL}/api/v1/feedback/${feedbackId}/messages`,
            JSON.stringify({ content: messageContent }),
            { headers }
          );
          messageAddTime.add(Date.now() - messageStart);
          
          const messageCheck = check(messageRes, {
            'employee add message status 201': (r) => r.status === 201,
          });
          errorRate.add(!messageCheck);
          sleep(1);
        }
      } catch (e) {
        errorRate.add(1);
      }
    }
  }
}

// Admin user flow
export function adminFlow() {
  const headers = {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // 1. List all feedback (admin sees all)
  const listStart = Date.now();
  const listRes = http.get(`${BASE_URL}/api/v1/feedback?page=1&size=20`, { headers });
  feedbackListTime.add(Date.now() - listStart);
  
  const listCheck = check(listRes, {
    'admin list feedback status 200': (r) => r.status === 200,
    'admin list has items array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.items && Array.isArray(body.items);
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!listCheck);
  sleep(1);

  // 2. Get feedback detail
  if (listRes.status === 200) {
    try {
      const body = JSON.parse(listRes.body);
      if (body.items && body.items.length > 0) {
        const feedbackId = body.items[0].feedback_id;
        
        const detailStart = Date.now();
        const detailRes = http.get(`${BASE_URL}/api/v1/feedback/${feedbackId}`, { headers });
        feedbackDetailTime.add(Date.now() - detailStart);
        
        const detailCheck = check(detailRes, {
          'admin get feedback detail status 200': (r) => r.status === 200,
        });
        errorRate.add(!detailCheck);
        sleep(1);

        // 3. Update feedback (admin only)
        if (detailRes.status === 200) {
          const updateData = {
            status: 'IN_PROGRESS',
            priority: 'HIGH',
          };
          
          const updateRes = http.patch(
            `${BASE_URL}/api/v1/feedback/${feedbackId}`,
            JSON.stringify(updateData),
            { headers }
          );
          
          const updateCheck = check(updateRes, {
            'admin update feedback status 200': (r) => r.status === 200,
          });
          errorRate.add(!updateCheck);
          sleep(1);

          // 4. Queue sentiment analysis (admin only)
          const analyzeRes = http.post(
            `${BASE_URL}/api/v1/feedback/${feedbackId}/analyze`,
            null,
            { headers }
          );
          
          const analyzeCheck = check(analyzeRes, {
            'admin analyze feedback status 200': (r) => r.status === 200,
          });
          errorRate.add(!analyzeCheck);
          sleep(1);
        }
      }
    } catch (e) {
      errorRate.add(1);
    }
  }

  // 5. Export CSV (admin only)
  const exportRes = http.get(`${BASE_URL}/api/v1/exports/feedback.csv`, { headers });
  const exportCheck = check(exportRes, {
    'admin export CSV status 200': (r) => r.status === 200,
    'admin export CSV has content': (r) => r.body && r.body.length > 0,
  });
  errorRate.add(!exportCheck);
  sleep(1);
}

// Health check (public endpoint)
export function healthCheck() {
  const healthRes = http.get(`${BASE_URL}/api/v1/healthz`);
  const healthCheck = check(healthRes, {
    'health check status 200': (r) => r.status === 200,
    'health check has status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!healthCheck);
  sleep(0.5);
}

// Main test function
export default function () {
  // 70% employee flow, 25% admin flow, 5% health check
  const rand = Math.random();
  
  if (rand < 0.70 && EMPLOYEE_TOKEN) {
    employeeFlow();
  } else if (rand < 0.95 && ADMIN_TOKEN) {
    adminFlow();
  } else {
    healthCheck();
  }
}

// Summary handler
export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    'phase7-feedback-perf-results.json': JSON.stringify(data, null, 2),
    'summary': `
Phase 7 Feedback API Performance Test Results
==============================================
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

Custom Metrics:
- Feedback Create (P95): ${data.metrics.feedback_create_time.values['p(95)'].toFixed(2)}ms
- Feedback List (P95): ${data.metrics.feedback_list_time.values['p(95)'].toFixed(2)}ms
- Feedback Detail (P95): ${data.metrics.feedback_detail_time.values['p(95)'].toFixed(2)}ms
- Message Add (P95): ${data.metrics.message_add_time.values['p(95)'].toFixed(2)}ms
    `,
  };
}

