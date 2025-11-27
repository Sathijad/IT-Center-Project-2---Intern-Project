import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const scheduleCreateTime = new Trend('schedule_create_time');
const scheduleListTime = new Trend('schedule_list_time');
const scheduleUpdateTime = new Trend('schedule_update_time');
const taskCreateTime = new Trend('task_create_time');
const taskListTime = new Trend('task_list_time');
const taskUpdateTime = new Trend('task_update_time');
const availabilityTime = new Trend('availability_time');
const apiCalls = new Counter('api_calls');

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 VUs
    { duration: '1m', target: 30 },     // Ramp up to 30 VUs
    { duration: '2m', target: 50 },     // Stay at 50 VUs (moderate load)
    { duration: '30s', target: 20 },     // Ramp down to 20 VUs
    { duration: '30s', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<350'],  // p95 < 350ms (as per release notes)
    http_req_failed: ['rate<0.01'],    // < 1% failed requests
    errors: ['rate<0.01'],             // < 1% errors
    schedule_create_time: ['p(95)<350'],
    schedule_list_time: ['p(95)<350'],
    schedule_update_time: ['p(95)<350'],
    task_create_time: ['p(95)<350'],
    task_list_time: ['p(95)<350'],
    task_update_time: ['p(95)<350'],
    availability_time: ['p(95)<350'],
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = __ENV.JWT_TOKEN || __ENV.AUTH_TOKEN || '';
const TEST_USER_ID = parseInt(__ENV.TEST_USER_ID || '1', 10);
const TEST_ASSIGNEE_ID = parseInt(__ENV.TEST_ASSIGNEE_ID || '2', 10);

// Helper function to get headers
function getHeaders() {
  return {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// Helper function to generate test data
function generateScheduleData() {
  const now = new Date();
  // Generate a random time slot between 30-90 days in the future to avoid conflicts
  // Use milliseconds since epoch to ensure uniqueness
  const daysAhead = 30 + Math.floor(Math.random() * 60); // 30-90 days
  const hoursOffset = Math.floor(Math.random() * 24); // 0-23 hours
  const minutesOffset = Math.floor(Math.random() * 60); // 0-59 minutes
  const secondsOffset = Math.floor(Math.random() * 60); // 0-59 seconds for more uniqueness
  
  // Add unique timestamp component to avoid conflicts
  const uniqueOffset = Math.floor(Math.random() * 1000); // 0-999 milliseconds
  
  const startTime = new Date(now.getTime() + 
    (daysAhead * 24 * 60 * 60 * 1000) + 
    (hoursOffset * 60 * 60 * 1000) + 
    (minutesOffset * 60 * 1000) +
    (secondsOffset * 1000) +
    uniqueOffset);
  const endTime = new Date(startTime.getTime() + 1 * 60 * 60 * 1000); // 1 hour duration
  
  // Randomly decide whether to create recurrence (20% chance to reduce conflicts)
  const createRecurrence = Math.random() < 0.2;
  let recurrence = null;
  
  if (createRecurrence) {
    const until = new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from start
    recurrence = {
      pattern: 'DAILY',
      interval: 1,
      byDay: null,
      byMonthDay: null,
      until: until.toISOString(),
    };
  }
  
  return {
    userId: TEST_USER_ID,
    title: `K6 Test Schedule ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    description: 'Performance test schedule entry',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    isAllDay: false,
    createRecurrence: createRecurrence,
    teamId: null,
    recurrence: recurrence,
  };
}

function generateTaskData() {
  const now = new Date();
  const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  
  return {
    title: `K6 Test Task ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    description: 'Performance test task',
    assigneeId: TEST_ASSIGNEE_ID,
    priority: 'Medium',
    dueDate: dueDate.toISOString(),
    tags: ['k6-test', 'performance'],
  };
}

// Main test function
export default function () {
  const headers = getHeaders();
  let scheduleId = null;
  let taskId = null;

  // Test 1: Health Check
  const healthRes = http.get(`${BASE_URL}/healthz`);
  const healthCheck = check(healthRes, {
    'health check status 200': (r) => r.status === 200,
  });
  errorRate.add(!healthCheck);
  apiCalls.add(1);
  sleep(0.5);

  // Test 2: List Schedules
  const listStartTime = Date.now();
  const schedulesRes = http.get(
    `${BASE_URL}/api/v1/schedules?page=1&size=20`,
    { headers }
  );
  const listEndTime = Date.now();
  scheduleListTime.add(listEndTime - listStartTime);
  
  const schedulesCheck = check(schedulesRes, {
    'schedules list status 200': (r) => r.status === 200,
    'schedules list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.items && Array.isArray(body.items);
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!schedulesCheck);
  apiCalls.add(1);
  sleep(0.5);

  // Extract schedule ID if available for update/delete operations
  if (schedulesRes.status === 200) {
    try {
      const schedules = JSON.parse(schedulesRes.body);
      if (schedules.items && schedules.items.length > 0) {
        scheduleId = schedules.items[0].scheduleId;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Test 3: Create Schedule (Admin only)
  const createStartTime = Date.now();
  const scheduleData = generateScheduleData();
  const createScheduleRes = http.post(
    `${BASE_URL}/api/v1/schedules`,
    JSON.stringify(scheduleData),
    { headers }
  );
  const createEndTime = Date.now();
  scheduleCreateTime.add(createEndTime - createStartTime);
  
  const createScheduleCheck = check(createScheduleRes, {
    'schedule create status 201': (r) => r.status === 201,
    'schedule create returns schedule': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.scheduleId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  // Log error details if creation failed
  if (createScheduleRes.status !== 201) {
    console.log(`Schedule create failed: ${createScheduleRes.status} - ${createScheduleRes.body.substring(0, 200)}`);
  }
  errorRate.add(!createScheduleCheck);
  apiCalls.add(1);

  // Extract created schedule ID
  if (createScheduleRes.status === 201) {
    try {
      const schedule = JSON.parse(createScheduleRes.body);
      scheduleId = schedule.scheduleId;
    } catch (e) {
      // Ignore parsing errors
    }
  }
  sleep(0.5);

  // Test 4: Update Schedule (if we have a schedule ID)
  if (scheduleId) {
    const updateStartTime = Date.now();
    const updateData = {
      title: `Updated K6 Test Schedule ${Date.now()}`,
      description: 'Updated performance test schedule',
    };
    const updateScheduleRes = http.patch(
      `${BASE_URL}/api/v1/schedules/${scheduleId}`,
      JSON.stringify(updateData),
      { headers }
    );
    const updateEndTime = Date.now();
    scheduleUpdateTime.add(updateEndTime - updateStartTime);
    
    const updateScheduleCheck = check(updateScheduleRes, {
      'schedule update status 200': (r) => r.status === 200,
    });
    errorRate.add(!updateScheduleCheck);
    apiCalls.add(1);
    sleep(0.5);
  }

  // Test 5: List Tasks
  const taskListStartTime = Date.now();
  const tasksRes = http.get(
    `${BASE_URL}/api/v1/tasks?page=1&size=20`,
    { headers }
  );
  const taskListEndTime = Date.now();
  taskListTime.add(taskListEndTime - taskListStartTime);
  
  const tasksCheck = check(tasksRes, {
    'tasks list status 200': (r) => r.status === 200,
    'tasks list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.items && Array.isArray(body.items);
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!tasksCheck);
  apiCalls.add(1);
  sleep(0.5);

  // Extract task ID if available
  if (tasksRes.status === 200) {
    try {
      const tasks = JSON.parse(tasksRes.body);
      if (tasks.items && tasks.items.length > 0) {
        taskId = tasks.items[0].taskId;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Test 6: Create Task
  const taskCreateStartTime = Date.now();
  const taskData = generateTaskData();
  const idempotencyKey = `k6-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const taskHeaders = Object.assign({}, headers);
    taskHeaders['Idempotency-Key'] = idempotencyKey;
    const createTaskRes = http.post(
      `${BASE_URL}/api/v1/tasks`,
      JSON.stringify(taskData),
      { headers: taskHeaders }
    );
  const taskCreateEndTime = Date.now();
  taskCreateTime.add(taskCreateEndTime - taskCreateStartTime);
  
  const createTaskCheck = check(createTaskRes, {
    'task create status 201': (r) => r.status === 201,
    'task create returns task': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.taskId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!createTaskCheck);
  apiCalls.add(1);

  // Extract created task ID
  if (createTaskRes.status === 201) {
    try {
      const task = JSON.parse(createTaskRes.body);
      taskId = task.taskId;
    } catch (e) {
      // Ignore parsing errors
    }
  }
  sleep(0.5);

  // Test 7: Update Task (if we have a task ID)
  if (taskId) {
    const taskUpdateStartTime = Date.now();
    const taskUpdateData = {
      status: 'InProgress',
      description: 'Updated performance test task',
    };
    const updateTaskRes = http.patch(
      `${BASE_URL}/api/v1/tasks/${taskId}`,
      JSON.stringify(taskUpdateData),
      { headers }
    );
    const taskUpdateEndTime = Date.now();
    taskUpdateTime.add(taskUpdateEndTime - taskUpdateStartTime);
    
    const updateTaskCheck = check(updateTaskRes, {
      'task update status 200': (r) => r.status === 200,
    });
    errorRate.add(!updateTaskCheck);
    apiCalls.add(1);
    sleep(0.5);

    // Test 8: Add Task Comment
    const commentData = {
      body: `K6 performance test comment ${Date.now()}`,
    };
    const commentRes = http.post(
      `${BASE_URL}/api/v1/tasks/${taskId}/comments`,
      JSON.stringify(commentData),
      { headers }
    );
    const commentCheck = check(commentRes, {
      'task comment status 200': (r) => r.status === 200,
    });
    errorRate.add(!commentCheck);
    apiCalls.add(1);
    sleep(0.5);
  }

  // Test 9: Get Availability
  const availabilityStartTime = Date.now();
  const now = new Date();
  const rangeStart = now.toISOString();
  const rangeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ahead
  
  const availabilityRes = http.get(
    `${BASE_URL}/api/v1/availability?user_id=${TEST_USER_ID}&rangeStart=${rangeStart}&rangeEnd=${rangeEnd}`,
    { headers }
  );
  const availabilityEndTime = Date.now();
  availabilityTime.add(availabilityEndTime - availabilityStartTime);
  
  const availabilityCheck = check(availabilityRes, {
    'availability status 200': (r) => r.status === 200,
    'availability has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.userId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!availabilityCheck);
  apiCalls.add(1);
  sleep(0.5);

  // Test 10: List Tasks with Filters
  const filteredTasksRes = http.get(
    `${BASE_URL}/api/v1/tasks?status=Pending&page=1&size=10`,
    { headers }
  );
  const filteredTasksCheck = check(filteredTasksRes, {
    'filtered tasks status 200': (r) => r.status === 200,
  });
  errorRate.add(!filteredTasksCheck);
  apiCalls.add(1);
  sleep(0.5);

  // Test 11: List Schedules with Date Range
  const rangeStartDate = new Date();
  const rangeEndDate = new Date(rangeStartDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead
  const rangedSchedulesRes = http.get(
    `${BASE_URL}/api/v1/schedules?rangeStart=${rangeStartDate.toISOString()}&rangeEnd=${rangeEndDate.toISOString()}&page=1&size=20`,
    { headers }
  );
  const rangedSchedulesCheck = check(rangedSchedulesRes, {
    'ranged schedules status 200': (r) => r.status === 200,
  });
  errorRate.add(!rangedSchedulesCheck);
  apiCalls.add(1);
  sleep(1);
}

// Summary handler for detailed reporting
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    metrics: {
      http_req_duration: data.metrics.http_req_duration,
      http_req_failed: data.metrics.http_req_failed,
      errors: data.metrics.errors,
      schedule_create_time: data.metrics.schedule_create_time,
      schedule_list_time: data.metrics.schedule_list_time,
      schedule_update_time: data.metrics.schedule_update_time,
      task_create_time: data.metrics.task_create_time,
      task_list_time: data.metrics.task_list_time,
      task_update_time: data.metrics.task_update_time,
      availability_time: data.metrics.availability_time,
      api_calls: data.metrics.api_calls,
    },
    thresholds: data.root_group.checks || [],
    summary: {
      total_requests: (data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.count) || 0,
      total_duration: (data.metrics.iteration_duration && data.metrics.iteration_duration.values && data.metrics.iteration_duration.values.avg) || 0,
      p95_duration: (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values['p(95)']) || 0,
      error_rate: (data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.rate) || 0,
    },
  };

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'phase4-perf-results.json': JSON.stringify(data, null, 2),
    'phase4-summary.json': JSON.stringify(summary, null, 2),
  };
}
