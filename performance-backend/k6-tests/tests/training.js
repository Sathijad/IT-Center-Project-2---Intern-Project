/**
 * k6 Performance Test: Training Endpoints
 * Tests training courses and assignments endpoints
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { config } from '../config.js';
import { getAuthToken, createAuthHeaders } from '../helpers/auth.js';
import {
  generateCreateCourseRequest,
  generateAssignTrainingRequest,
  generateUserId,
} from '../helpers/data.js';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 8 },  // Ramp up
    { duration: '3m', target: 8 },  // Stay at 8 VUs
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<600', 'p(99)<1200'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.1'],
  },
};

export function setup() {
  const token = getAuthToken(config.baseUrl);
  return { token };
}

export default function (data) {
  const { token } = data;
  const baseUrl = config.baseUrl;
  const headers = createAuthHeaders(token);

  // Test 1: Get courses (paginated)
  let response = http.get(`${baseUrl}/api/v1/training/courses?page=1&size=20`, headers);
  let success = check(response, {
    'get courses status is 200': (r) => r.status === 200,
    'get courses has items': (r) => r.json('items') !== undefined,
    'get courses response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 2: Search courses
  response = http.get(`${baseUrl}/api/v1/training/courses?query=test&page=1&size=10`, headers);
  success = check(response, {
    'search courses status is 200': (r) => r.status === 200,
    'search courses response time < 600ms': (r) => r.timings.duration < 600,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 3: Create course
  const coursePayload = JSON.stringify(generateCreateCourseRequest());
  response = http.post(`${baseUrl}/api/v1/training/courses`, coursePayload, headers);
  success = check(response, {
    'create course status is 201': (r) => r.status === 201,
    'create course has courseId': (r) => r.json('courseId') !== undefined,
    'create course response time < 800ms': (r) => r.timings.duration < 800,
  });
  errorRate.add(!success);
  
  if (!success || response.status !== 201) {
    sleep(1);
    return;
  }
  
  const courseId = response.json('courseId');
  sleep(1);

  // Test 4: Get course by ID
  response = http.get(`${baseUrl}/api/v1/training/courses/${courseId}`, headers);
  success = check(response, {
    'get course by ID status is 200': (r) => r.status === 200,
    'get course by ID has correct courseId': (r) => r.json('courseId') === courseId,
    'get course by ID response time < 300ms': (r) => r.timings.duration < 300,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 5: Update course
  const updatePayload = JSON.stringify({
    title: 'Updated Course Title',
    description: 'Updated description',
  });
  response = http.patch(`${baseUrl}/api/v1/training/courses/${courseId}`, updatePayload, headers);
  success = check(response, {
    'update course status is 200': (r) => r.status === 200,
    'update course response time < 600ms': (r) => r.timings.duration < 600,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 6: Assign training
  const assignPayload = JSON.stringify(generateAssignTrainingRequest(courseId));
  response = http.post(`${baseUrl}/api/v1/training/assign`, assignPayload, headers);
  success = check(response, {
    'assign training status is 201': (r) => r.status === 201,
    'assign training has assignments': (r) => Array.isArray(r.json()) && r.json().length > 0,
    'assign training response time < 800ms': (r) => r.timings.duration < 800,
  });
  errorRate.add(!success);
  
  if (!success || response.status !== 201) {
    sleep(1);
    return;
  }
  
  const assignmentId = response.json()[0].assignmentId;
  sleep(1);

  // Test 7: Get assignments
  const userId = generateUserId();
  response = http.get(`${baseUrl}/api/v1/training/assignments?user_id=${userId}`, headers);
  success = check(response, {
    'get assignments status is 200': (r) => r.status === 200,
    'get assignments has data': (r) => Array.isArray(r.json()),
    'get assignments response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!success);
  sleep(1);

  // Test 8: Update assignment
  const updateAssignPayload = JSON.stringify({
    status: 'InProgress',
    progress: 50,
  });
  response = http.patch(`${baseUrl}/api/v1/training/assignments/${assignmentId}`, updateAssignPayload, headers);
  success = check(response, {
    'update assignment status is 200': (r) => r.status === 200,
    'update assignment response time < 600ms': (r) => r.timings.duration < 600,
  });
  errorRate.add(!success);
  sleep(1);
}

