/**
 * VendHub OS — Smoke Test
 *
 * Quick validation that all critical endpoints respond correctly under minimal load.
 * Duration: ~30 seconds with 1-2 VUs
 *
 * Run: k6 run tests/load/smoke.js
 */

import { group, check } from 'k6';
import http from 'k6/http';
import { BASE_URL, API_PREFIX, THRESHOLDS, TEST_DATA } from './config.js';
import { login, authGet, randomSleep } from './helpers.js';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'], // Allow 5% error rate in smoke test
  },
  tags: {
    test_type: 'smoke',
  },
};

export function setup() {
  // Authenticate once and return token for all VUs
  const token = login();
  if (!token) {
    throw new Error('Authentication failed in setup');
  }
  return { token };
}

export default function (data) {
  const { token } = data;

  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok';
        } catch {
          return false;
        }
      },
    });
    randomSleep(0.5, 1);
  });

  group('Authentication', () => {
    const newToken = login();
    check(newToken, {
      'can authenticate': (t) => t !== null && t !== undefined,
    });
    randomSleep(0.5, 1);
  });

  group('Machines API', () => {
    const res = authGet('/machines?page=1&limit=10', token, 'list machines');
    check(res, {
      'machines response has items': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data?.items) || Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });
    randomSleep(0.5, 1);
  });

  group('Products API', () => {
    const res = authGet('/products?page=1&limit=10', token, 'list products');
    check(res, {
      'products response has items': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data?.items) || Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });
    randomSleep(0.5, 1);
  });

  group('Tasks API', () => {
    const res = authGet('/tasks?page=1&limit=10', token, 'list tasks');
    check(res, {
      'tasks response has items': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data?.items) || Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });
    randomSleep(0.5, 1);
  });

  group('Dashboard API', () => {
    const res = authGet('/dashboard/stats', token, 'dashboard stats');
    check(res, {
      'dashboard returns stats': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data !== undefined;
        } catch {
          return false;
        }
      },
    });
    randomSleep(0.5, 1);
  });

  group('Inventory API', () => {
    const res = authGet('/inventory?page=1&limit=10', token, 'list inventory');
    check(res, {
      'inventory response is valid': (r) => r.status === 200 || r.status === 404,
    });
    randomSleep(0.5, 1);
  });
}

export function teardown(data) {
  console.log('Smoke test completed');
}
