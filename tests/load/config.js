/**
 * VendHub OS — k6 Load Testing Configuration
 *
 * Usage:
 *   k6 run tests/load/smoke.js
 *   k6 run tests/load/load.js
 *   k6 run tests/load/stress.js
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
export const API_PREFIX = '/api/v1';

// Test user credentials
export const TEST_USER = {
  email: __ENV.TEST_EMAIL || 'admin@vendhub.com',
  password: __ENV.TEST_PASSWORD || 'admin123',
};

// Thresholds
export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
  http_req_failed: ['rate<0.01'],
  http_reqs: ['rate>100'],
};

// Common test data
export const TEST_DATA = {
  // Organization IDs (replace with actual IDs from your test DB)
  organizationId: __ENV.TEST_ORG_ID || '00000000-0000-0000-0000-000000000001',

  // Pagination defaults
  pagination: {
    page: 1,
    limit: 20,
  },

  // Task update status
  taskStatuses: ['pending', 'in_progress', 'completed', 'cancelled'],

  // Machine statuses
  machineStatuses: ['active', 'inactive', 'maintenance', 'offline'],
};
