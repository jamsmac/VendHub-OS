/**
 * VendHub OS — Stress Test
 *
 * Find system breaking points by gradually increasing load.
 * Ramps from 10 to 200 VUs over 10 minutes, then back down.
 *
 * Run: k6 run tests/load/stress.js
 */

import { group, check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import {
  login,
  authGet,
  authPost,
  authPatch,
  randomSleep,
  randomItem,
  extractData,
  parseResponse,
} from './helpers.js';

// Custom metrics
const errorRate = new Rate('errors');
const timeoutRate = new Rate('timeouts');
const successfulRequests = new Counter('successful_requests');

export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Ramp to 50 users
    { duration: '3m', target: 100 }, // Ramp to 100 users
    { duration: '3m', target: 150 }, // Ramp to 150 users
    { duration: '2m', target: 200 }, // Ramp to 200 users (stress)
    { duration: '3m', target: 200 }, // Hold at 200 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<3000'], // More lenient for stress test
    http_req_failed: ['rate<0.1'], // Allow 10% error rate under stress
    errors: ['rate<0.15'], // Track custom error rate
    timeouts: ['rate<0.05'], // Track timeouts
  },
  tags: {
    test_type: 'stress',
  },
};

export function setup() {
  const token = login();
  if (!token) {
    throw new Error('Authentication failed in setup');
  }
  return { token };
}

export default function (data) {
  const { token } = data;

  // Heavy read load (machines and products)
  group('Heavy Read Load', () => {
    try {
      // List machines with pagination
      const res1 = authGet('/machines?page=1&limit=50', token, 'list machines (page 1)');
      if (res1.status === 200) {
        successfulRequests.add(1);
        errorRate.add(0);
      } else {
        errorRate.add(1);
      }

      randomSleep(0.5, 1);

      // List products with filters
      const res2 = authGet(
        '/products?page=1&limit=50&sort=name&order=asc',
        token,
        'list products with sort'
      );
      if (res2.status === 200) {
        successfulRequests.add(1);
        errorRate.add(0);
      } else {
        errorRate.add(1);
      }

      randomSleep(0.5, 1);

      // List tasks
      const res3 = authGet('/tasks?page=1&limit=30', token, 'list tasks');
      if (res3.status === 200) {
        successfulRequests.add(1);
        errorRate.add(0);
      } else {
        errorRate.add(1);
      }
    } catch (error) {
      errorRate.add(1);
      console.error('Heavy read load error:', error);
    }
  });

  randomSleep(1, 2);

  // Concurrent task updates
  group('Concurrent Task Updates', () => {
    try {
      // Get pending tasks
      const tasksRes = authGet('/tasks?page=1&limit=5&status=pending', token);
      const tasks = extractData(tasksRes);

      if (tasks.length > 0) {
        // Update random task
        const task = randomItem(tasks);
        const newStatus = randomItem(['in_progress', 'completed']);

        const updateRes = authPatch(
          `/tasks/${task.id}`,
          { status: newStatus },
          token,
          'update task concurrently'
        );

        if (updateRes.status >= 200 && updateRes.status < 300) {
          successfulRequests.add(1);
          errorRate.add(0);
        } else {
          errorRate.add(1);
        }
      }
    } catch (error) {
      errorRate.add(1);
      console.error('Task update error:', error);
    }
  });

  randomSleep(1, 2);

  // Dashboard under load
  group('Dashboard Under Load', () => {
    try {
      // Get dashboard stats
      const statsRes = authGet('/dashboard/stats', token, 'dashboard stats under stress');
      if (statsRes.status === 200) {
        successfulRequests.add(1);
        errorRate.add(0);
      } else {
        errorRate.add(1);
      }

      randomSleep(0.5, 1);

      // Get machine statistics
      const machineStatsRes = authGet(
        '/statistics/machines',
        token,
        'machine statistics under stress'
      );
      if (machineStatsRes.status === 200) {
        successfulRequests.add(1);
        errorRate.add(0);
      } else {
        errorRate.add(1);
      }
    } catch (error) {
      errorRate.add(1);
      console.error('Dashboard load error:', error);
    }
  });

  randomSleep(1, 2);

  // Multiple simultaneous logins (stress auth)
  if (Math.random() < 0.2) {
    // 20% of users re-authenticate
    group('Auth Under Stress', () => {
      try {
        const newToken = login();
        if (newToken) {
          successfulRequests.add(1);
          errorRate.add(0);

          // Immediately use token
          const profileRes = authGet('/auth/profile', newToken, 'profile after login');
          if (profileRes.status === 200) {
            successfulRequests.add(1);
            errorRate.add(0);
          } else {
            errorRate.add(1);
          }
        } else {
          errorRate.add(1);
        }
      } catch (error) {
        errorRate.add(1);
        console.error('Auth stress error:', error);
      }
    });
  }

  randomSleep(1, 3);

  // Complex queries (stress database)
  group('Complex Queries', () => {
    try {
      // Search across machines with multiple filters
      const searchRes = authGet(
        '/machines?page=1&limit=20&search=vend&status=active',
        token,
        'complex machine search'
      );
      if (searchRes.status === 200) {
        successfulRequests.add(1);
        errorRate.add(0);
      } else {
        errorRate.add(1);
      }

      randomSleep(0.5, 1);

      // Get reports with date ranges
      const reportRes = authGet(
        '/reports/sales?period=month&startDate=2024-01-01&endDate=2024-12-31',
        token,
        'complex sales report'
      );
      if (reportRes.status === 200 || reportRes.status === 404) {
        // 404 acceptable if no data
        successfulRequests.add(1);
        errorRate.add(0);
      } else {
        errorRate.add(1);
      }
    } catch (error) {
      errorRate.add(1);
      console.error('Complex query error:', error);
    }
  });

  randomSleep(2, 4);
}

export function teardown(data) {
  console.log('Stress test completed');
  console.log('Review error rates and response times to identify breaking points');
}
