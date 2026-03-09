/**
 * VendHub OS — k6 Load Test
 *
 * Tests key API endpoints under realistic load.
 *
 * Usage:
 *   k6 run infrastructure/k6/load-test.js
 *   k6 run --env BASE_URL=https://vendhubapi-production.up.railway.app infrastructure/k6/load-test.js
 *   k6 run --env BASE_URL=http://localhost:4000 --env AUTH_TOKEN=<jwt> infrastructure/k6/load-test.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const apiDuration = new Trend("api_duration", true);

// Configuration
const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const API = `${BASE_URL}/api/v1`;
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

const authHeaders = AUTH_TOKEN
  ? {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    }
  : { "Content-Type": "application/json" };

// Load profile: ramp up → sustained → ramp down
export const options = {
  stages: [
    { duration: "30s", target: 10 }, // Ramp up to 10 VUs
    { duration: "1m", target: 20 }, // Ramp up to 20 VUs
    { duration: "2m", target: 20 }, // Sustain 20 VUs
    { duration: "30s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"], // 95th < 500ms, 99th < 1s
    errors: ["rate<0.05"], // Error rate < 5%
    api_duration: ["p(95)<400"], // Business endpoints < 400ms
  },
};

export default function () {
  group("Health Check", () => {
    const res = http.get(`${API}/health`);
    check(res, {
      "health 200": (r) => r.status === 200,
      "health < 200ms": (r) => r.timings.duration < 200,
    });
    errorRate.add(res.status !== 200);
  });

  group("Public Endpoints", () => {
    // Machines list
    const machines = http.get(`${API}/machines`);
    check(machines, {
      "machines 200": (r) => r.status === 200,
      "machines is array": (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });
    apiDuration.add(machines.timings.duration);
    errorRate.add(machines.status >= 400);

    // Products list
    const products = http.get(`${API}/products`);
    check(products, {
      "products 200": (r) => r.status === 200,
    });
    apiDuration.add(products.timings.duration);
    errorRate.add(products.status >= 400);
  });

  if (AUTH_TOKEN) {
    group("Authenticated Endpoints", () => {
      // My orders
      const orders = http.get(`${API}/orders/my`, { headers: authHeaders });
      check(orders, {
        "orders 200": (r) => r.status === 200,
      });
      apiDuration.add(orders.timings.duration);
      errorRate.add(orders.status >= 400);

      // Loyalty info
      const loyalty = http.get(`${API}/loyalty/me`, { headers: authHeaders });
      check(loyalty, {
        "loyalty 200|404": (r) => r.status === 200 || r.status === 404,
      });
      apiDuration.add(loyalty.timings.duration);

      // Quests
      const quests = http.get(`${API}/quests`, { headers: authHeaders });
      check(quests, {
        "quests 200": (r) => r.status === 200,
      });
      apiDuration.add(quests.timings.duration);
    });
  }

  sleep(1); // 1 second think time between iterations
}
