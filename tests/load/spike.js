/**
 * VendHub OS — Spike Test
 *
 * Simulate sudden traffic spikes (e.g., morning rush when operators start shifts).
 * Tests system's ability to handle sudden load increases and recover.
 *
 * Run: k6 run tests/load/spike.js
 */

import { group, check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
  login,
  authGet,
  authPost,
  randomSleep,
  randomItem,
  extractData,
} from './helpers.js';

// Custom metrics
const spikeErrors = new Rate('spike_errors');
const recoveryTime = new Trend('recovery_time');
const loginAttempts = new Counter('login_attempts');

export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Baseline: 10 users
    { duration: '10s', target: 100 }, // Spike: sudden jump to 100 users
    { duration: '2m', target: 100 }, // Hold spike
    { duration: '10s', target: 10 }, // Recovery: back to baseline
    { duration: '1m', target: 10 }, // Recovery period
    { duration: '10s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // Allow higher latency during spike
    http_req_failed: ['rate<0.15'], // Allow 15% error rate during spike
    spike_errors: ['rate<0.2'], // Track spike-specific errors
  },
  tags: {
    test_type: 'spike',
  },
};

export function setup() {
  const token = login();
  if (!token) {
    throw new Error('Authentication failed in setup');
  }
  return { token, spikeStartTime: null };
}

export default function (data) {
  const { token } = data;
  const startTime = new Date();

  // Simulate morning operator routine
  group('Morning Login Rush', () => {
    try {
      // Operators login simultaneously
      const loginToken = login();
      loginAttempts.add(1);

      if (loginToken) {
        spikeErrors.add(0);

        // Get profile immediately
        const profileRes = authGet('/auth/profile', loginToken, 'get profile on login');
        if (profileRes.status !== 200) {
          spikeErrors.add(1);
        }

        randomSleep(0.5, 1);

        // Check assigned tasks
        const tasksRes = authGet(
          '/tasks?page=1&limit=10&assignedToMe=true',
          loginToken,
          'get assigned tasks'
        );
        if (tasksRes.status !== 200) {
          spikeErrors.add(1);
        }
      } else {
        spikeErrors.add(1);
      }
    } catch (error) {
      spikeErrors.add(1);
      console.error('Login rush error:', error);
    }
  });

  randomSleep(1, 2);

  // Check machines (operators checking their routes)
  group('Check Machines', () => {
    try {
      const machinesRes = authGet(
        '/machines?page=1&limit=20&status=active',
        token,
        'check active machines'
      );

      if (machinesRes.status === 200) {
        spikeErrors.add(0);

        const machines = extractData(machinesRes);
        if (machines.length > 0) {
          // Get details of first machine
          const machine = machines[0];
          const detailsRes = authGet(
            `/machines/${machine.id}`,
            token,
            'get machine details'
          );
          if (detailsRes.status !== 200) {
            spikeErrors.add(1);
          }
        }
      } else {
        spikeErrors.add(1);
      }
    } catch (error) {
      spikeErrors.add(1);
      console.error('Machine check error:', error);
    }
  });

  randomSleep(1, 2);

  // Dashboard check (managers and admins)
  group('Dashboard Access', () => {
    try {
      const statsRes = authGet('/dashboard/stats', token, 'dashboard during spike');

      if (statsRes.status === 200) {
        spikeErrors.add(0);
      } else {
        spikeErrors.add(1);
      }

      randomSleep(0.5, 1);

      // Get today's overview
      const overviewRes = authGet(
        '/dashboard/overview?period=today',
        token,
        'today overview'
      );
      if (overviewRes.status === 200 || overviewRes.status === 404) {
        spikeErrors.add(0);
      } else {
        spikeErrors.add(1);
      }
    } catch (error) {
      spikeErrors.add(1);
      console.error('Dashboard access error:', error);
    }
  });

  randomSleep(1, 2);

  // Inventory checks (warehouse staff)
  group('Inventory Checks', () => {
    try {
      const inventoryRes = authGet(
        '/inventory?page=1&limit=20',
        token,
        'inventory during spike'
      );

      if (inventoryRes.status === 200 || inventoryRes.status === 404) {
        spikeErrors.add(0);

        // Check low stock items
        const lowStockRes = authGet(
          '/inventory?filter=low_stock',
          token,
          'low stock check'
        );
        if (lowStockRes.status === 200 || lowStockRes.status === 404) {
          spikeErrors.add(0);
        } else {
          spikeErrors.add(1);
        }
      } else {
        spikeErrors.add(1);
      }
    } catch (error) {
      spikeErrors.add(1);
      console.error('Inventory check error:', error);
    }
  });

  randomSleep(1, 2);

  // Create tasks (supervisors assigning work)
  if (Math.random() < 0.3) {
    // 30% create tasks
    group('Create Morning Tasks', () => {
      try {
        const newTask = {
          title: `Morning Task ${Date.now()}`,
          description: 'Task created during spike test',
          type: 'refill',
          priority: 'high',
          status: 'pending',
        };

        const createRes = authPost('/tasks', newTask, token, 'create task during spike');

        if (createRes.status >= 200 && createRes.status < 300) {
          spikeErrors.add(0);
        } else {
          spikeErrors.add(1);
        }
      } catch (error) {
        spikeErrors.add(1);
        console.error('Task creation error:', error);
      }
    });
  }

  // Calculate recovery time
  const endTime = new Date();
  const duration = endTime - startTime;
  recoveryTime.add(duration);

  randomSleep(2, 4);
}

export function teardown(data) {
  console.log('Spike test completed');
  console.log('Review spike_errors and recovery_time metrics');
  console.log('Check if system recovered gracefully after spike');
}
