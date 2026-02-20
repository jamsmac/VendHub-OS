import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, API_PREFIX, TEST_USER } from './config.js';

/**
 * Authenticate and return access token
 */
export function login() {
  const res = http.post(
    `${BASE_URL}${API_PREFIX}/auth/login`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(res, {
    'login status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data?.accessToken || body.accessToken;
      } catch {
        return false;
      }
    },
  });

  if (success && (res.status === 200 || res.status === 201)) {
    const body = JSON.parse(res.body);
    return body.data?.accessToken || body.accessToken;
  }

  console.error('Login failed:', res.status, res.body);
  return null;
}

/**
 * Generate auth headers with Bearer token
 */
export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

/**
 * Make authenticated GET request
 */
export function authGet(url, token, name = null) {
  const res = http.get(`${BASE_URL}${API_PREFIX}${url}`, authHeaders(token));

  check(res, {
    [`${name || url} - status is 200`]: (r) => r.status === 200,
    [`${name || url} - response has body`]: (r) => r.body && r.body.length > 0,
  });

  return res;
}

/**
 * Make authenticated POST request
 */
export function authPost(url, body, token, name = null) {
  const res = http.post(
    `${BASE_URL}${API_PREFIX}${url}`,
    JSON.stringify(body),
    authHeaders(token)
  );

  check(res, {
    [`${name || url} - status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });

  return res;
}

/**
 * Make authenticated PATCH request
 */
export function authPatch(url, body, token, name = null) {
  const res = http.patch(
    `${BASE_URL}${API_PREFIX}${url}`,
    JSON.stringify(body),
    authHeaders(token)
  );

  check(res, {
    [`${name || url} - status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });

  return res;
}

/**
 * Random sleep to simulate real user behavior
 */
export function randomSleep(min = 1, max = 3) {
  const duration = Math.random() * (max - min) + min;
  sleep(duration);
}

/**
 * Get random item from array
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Parse API response
 */
export function parseResponse(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    console.error('Failed to parse response:', res.body);
    return null;
  }
}

/**
 * Extract data from paginated response
 */
export function extractData(res) {
  const parsed = parseResponse(res);
  if (!parsed) return [];

  // Handle different response structures
  return parsed.data?.items || parsed.data || parsed.items || [];
}
