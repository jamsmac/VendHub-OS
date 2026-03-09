/**
 * VendHub OS — k6 Spike Test
 *
 * Tests system resilience under sudden traffic spikes.
 * Simulates flash sale / viral traffic scenarios.
 *
 * Usage:
 *   k6 run infrastructure/k6/spike-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");
const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const API = `${BASE_URL}/api/v1`;

export const options = {
  stages: [
    { duration: "10s", target: 5 }, // Warm up
    { duration: "10s", target: 50 }, // Spike to 50 VUs
    { duration: "30s", target: 50 }, // Hold spike
    { duration: "10s", target: 5 }, // Scale down
    { duration: "30s", target: 5 }, // Recovery period
    { duration: "10s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // Relaxed: 95th < 2s under spike
    errors: ["rate<0.10"], // Allow up to 10% errors during spike
  },
};

export default function () {
  // Health endpoint — should always be fast
  const health = http.get(`${API}/health`);
  check(health, { "health ok": (r) => r.status === 200 });
  errorRate.add(health.status !== 200);

  // Machine listing — most common public endpoint
  const machines = http.get(`${API}/machines`);
  check(machines, { "machines ok": (r) => r.status === 200 });
  errorRate.add(machines.status >= 400);

  // Products — second most common
  const products = http.get(`${API}/products`);
  check(products, { "products ok": (r) => r.status === 200 });
  errorRate.add(products.status >= 400);

  // Auth endpoint spike — tests rate limiting (provide TEST_PHONE/TEST_PASS via env)
  if (__ENV.TEST_PHONE) {
    const login = http.post(
      `${API}/auth/login`,
      JSON.stringify({ phone: __ENV.TEST_PHONE, pass: __ENV.TEST_PASS }),
      { headers: { "Content-Type": "application/json" } },
    );
    check(login, {
      "login rejected gracefully": (r) => r.status === 401 || r.status === 429,
    });
    // 429 (rate limited) is expected under spike — not an error
    errorRate.add(login.status >= 500);
  }
  errorRate.add(login.status >= 500);

  sleep(0.5);
}
