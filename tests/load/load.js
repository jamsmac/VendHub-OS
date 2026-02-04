/**
 * VendHub OS — Load Test
 *
 * Simulate typical business day traffic with realistic user behavior.
 * Duration: ~8 minutes total (2min ramp up, 5min sustain, 1min ramp down)
 *
 * Run: k6 run tests/load/load.js
 */

import { group, check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { THRESHOLDS } from './config.js';
import {
  login,
  authGet,
  authPost,
  authPatch,
  randomSleep,
  randomItem,
  extractData,
} from './helpers.js';

// Custom metrics
const readOperations = new Counter('read_operations');
const writeOperations = new Counter('write_operations');
const dashboardViews = new Counter('dashboard_views');
const authOperations = new Counter('auth_operations');

export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 0 }, // Ramp down to 0
  ],
  thresholds: THRESHOLDS,
  tags: {
    test_type: 'load',
  },
};

export function setup() {
  const token = login();
  if (!token) {
    throw new Error('Authentication failed in setup');
  }

  // Pre-fetch some IDs for updates
  return { token };
}

export default function (data) {
  const { token } = data;

  // Simulate different user behaviors based on probability
  const rand = Math.random();

  if (rand < 0.4) {
    // 40% - Read operations (list machines, products, tasks)
    readOperationsScenario(token);
  } else if (rand < 0.6) {
    // 20% - Dashboard/reports
    dashboardScenario(token);
  } else if (rand < 0.75) {
    // 15% - Task status updates
    taskUpdateScenario(token);
  } else if (rand < 0.85) {
    // 10% - Inventory checks
    inventoryScenario(token);
  } else if (rand < 0.95) {
    // 10% - Login/auth refresh
    authScenario();
  } else {
    // 5% - Create operations
    createOperationsScenario(token);
  }

  randomSleep(2, 5); // Think time between user actions
}

function readOperationsScenario(token) {
  group('Read Operations', () => {
    // List machines
    authGet('/machines?page=1&limit=20', token, 'list machines');
    readOperations.add(1);
    randomSleep(1, 2);

    // Get machine details (simulate clicking on first machine)
    const machinesRes = authGet('/machines?page=1&limit=5', token);
    const machines = extractData(machinesRes);
    if (machines.length > 0) {
      const machineId = machines[0].id;
      authGet(`/machines/${machineId}`, token, 'get machine details');
      readOperations.add(1);
    }
    randomSleep(1, 2);

    // List products
    authGet('/products?page=1&limit=20', token, 'list products');
    readOperations.add(1);
    randomSleep(1, 2);

    // List tasks
    authGet('/tasks?page=1&limit=20', token, 'list tasks');
    readOperations.add(1);
  });
}

function dashboardScenario(token) {
  group('Dashboard & Reports', () => {
    // Get dashboard stats
    authGet('/dashboard/stats', token, 'dashboard stats');
    dashboardViews.add(1);
    randomSleep(1, 2);

    // Get machine statistics
    authGet('/statistics/machines', token, 'machine statistics');
    dashboardViews.add(1);
    randomSleep(1, 2);

    // Get sales report
    authGet('/reports/sales?period=week', token, 'sales report');
    dashboardViews.add(1);
    randomSleep(1, 2);

    // Get inventory report
    authGet('/reports/inventory', token, 'inventory report');
    dashboardViews.add(1);
  });
}

function taskUpdateScenario(token) {
  group('Task Updates', () => {
    // Get tasks
    const tasksRes = authGet('/tasks?page=1&limit=10&status=pending', token);
    const tasks = extractData(tasksRes);
    readOperations.add(1);
    randomSleep(1, 2);

    if (tasks.length > 0) {
      // Update task status
      const taskId = tasks[0].id;
      const newStatus = randomItem(['in_progress', 'completed']);

      authPatch(
        `/tasks/${taskId}`,
        { status: newStatus },
        token,
        'update task status'
      );
      writeOperations.add(1);
      randomSleep(1, 2);

      // Get updated task
      authGet(`/tasks/${taskId}`, token, 'get updated task');
      readOperations.add(1);
    }
  });
}

function inventoryScenario(token) {
  group('Inventory Operations', () => {
    // List inventory
    authGet('/inventory?page=1&limit=20', token, 'list inventory');
    readOperations.add(1);
    randomSleep(1, 2);

    // Get low stock items
    authGet('/inventory?page=1&limit=10&filter=low_stock', token, 'low stock items');
    readOperations.add(1);
    randomSleep(1, 2);

    // Get warehouse inventory
    authGet('/warehouse/inventory', token, 'warehouse inventory');
    readOperations.add(1);
  });
}

function authScenario() {
  group('Authentication', () => {
    // Login
    const token = login();
    authOperations.add(1);
    randomSleep(1, 2);

    if (token) {
      // Get profile
      authGet('/auth/profile', token, 'get profile');
      readOperations.add(1);
      randomSleep(1, 2);

      // Refresh token
      authPost('/auth/refresh', {}, token, 'refresh token');
      authOperations.add(1);
    }
  });
}

function createOperationsScenario(token) {
  group('Create Operations', () => {
    // Create task
    const newTask = {
      title: `Load Test Task ${Date.now()}`,
      description: 'Generated by k6 load test',
      type: 'maintenance',
      priority: 'medium',
      status: 'pending',
    };

    const taskRes = authPost('/tasks', newTask, token, 'create task');
    writeOperations.add(1);
    randomSleep(1, 2);

    // Verify task was created
    const taskData = taskRes.json();
    if (taskData && taskData.data && taskData.data.id) {
      authGet(`/tasks/${taskData.data.id}`, token, 'verify created task');
      readOperations.add(1);
    }
  });
}

export function teardown(data) {
  console.log('Load test completed');
  console.log('Check custom metrics in the summary output');
}
