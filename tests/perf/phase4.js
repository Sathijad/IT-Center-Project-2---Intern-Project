import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<350'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.itcenter.local';
const TOKEN = __ENV.JWT || '';

export default function () {
  const headers = { Authorization: `Bearer ${TOKEN}` };

  const schedules = http.get(`${BASE_URL}/api/v1/schedules?size=20`, { headers });
  check(schedules, {
    'schedules status is 200': (r) => r.status === 200,
  });

  const tasks = http.get(`${BASE_URL}/api/v1/tasks?size=20`, { headers });
  check(tasks, {
    'tasks status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

