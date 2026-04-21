/**
 * VendHub OS — Predictive Refill k6 Load Test
 *
 * Tests the predictive refill hot path after Sprint E+F:
 *   - Recommendations list (with sparkline batch loading)
 *   - Per-machine forecast detail
 *   - Auto-route generation (expensive — nearest-neighbor + 2-opt)
 *
 * Usage:
 *   k6 run --env BASE_URL=https://vendhubapi-production.up.railway.app \
 *          --env AUTH_TOKEN=<jwt> \
 *          infrastructure/k6/predictive-refill-test.js
 *
 * Expected to run against production-like data (~23 machines, ~100 products).
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const recommendationsDuration = new Trend("recommendations_duration", true);
const forecastDuration = new Trend("forecast_duration", true);
const autoRouteDuration = new Trend("auto_route_duration", true);

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const API = `${BASE_URL}/api/v1`;
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

if (!AUTH_TOKEN) {
  throw new Error(
    "AUTH_TOKEN required. Set via --env AUTH_TOKEN=<jwt>. Obtain a JWT via login endpoint first.",
  );
}

const headers = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  "Content-Type": "application/json",
};

export const options = {
  stages: [
    { duration: "20s", target: 5 },
    { duration: "40s", target: 10 },
    { duration: "1m", target: 10 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    // Recommendations list is hot — must be fast
    recommendations_duration: ["p(95)<500", "p(99)<1000"],
    // Forecast is per-machine drill-down — can be slower
    forecast_duration: ["p(95)<600", "p(99)<1200"],
    // Auto-route is expensive — nearest-neighbor + 2-opt + DB writes
    auto_route_duration: ["p(95)<2000", "p(99)<5000"],
    errors: ["rate<0.01"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

// Cache machine IDs across VU iterations
let cachedMachineIds = [];

export function setup() {
  // Fetch machine IDs once so VUs can randomly pick for forecast tests
  const res = http.get(`${API}/machines?limit=50`, { headers });
  if (res.status !== 200) {
    console.warn(`Setup: failed to fetch machines (${res.status})`);
    return { machineIds: [] };
  }
  const body = res.json();
  const ids = (body.data || []).map((m) => m.id);
  console.log(`Setup: cached ${ids.length} machine IDs`);
  return { machineIds: ids };
}

export default function (data) {
  // 50% of VU time: list recommendations (most common dashboard hit)
  group("recommendations list", () => {
    const start = Date.now();
    const res = http.get(`${API}/predictive-refill/recommendations?limit=50`, {
      headers,
      tags: { endpoint: "recommendations_list" },
    });
    recommendationsDuration.add(Date.now() - start);

    const ok = check(res, {
      "status 200": (r) => r.status === 200,
      "has data array": (r) => r.json("data") !== undefined,
      "sparklines included": (r) => {
        const items = r.json("data");
        return items && items.length === 0
          ? true
          : items && items[0].recentRates !== undefined;
      },
    });
    errorRate.add(!ok);
  });

  sleep(1);

  // 40% of VU time: drill into a machine forecast
  if (data.machineIds && data.machineIds.length > 0) {
    const machineId =
      data.machineIds[Math.floor(Math.random() * data.machineIds.length)];
    group("forecast detail", () => {
      const start = Date.now();
      const res = http.get(`${API}/predictive-refill/forecast/${machineId}`, {
        headers,
        tags: { endpoint: "forecast_detail" },
      });
      forecastDuration.add(Date.now() - start);

      const ok = check(res, {
        "status 200": (r) => r.status === 200,
        "is array": (r) => Array.isArray(r.json()),
      });
      errorRate.add(!ok);
    });

    sleep(1);
  }

  // 10% of VU iterations: trigger auto-route (expensive, don't hammer)
  if (Math.random() < 0.1) {
    group("auto route generation", () => {
      const start = Date.now();
      const res = http.post(
        `${API}/routes/auto-generate`,
        JSON.stringify({ includeRefillSoon: false }),
        { headers, tags: { endpoint: "auto_route" } },
      );
      autoRouteDuration.add(Date.now() - start);

      const ok = check(res, {
        "status 200 or 201 or 400 (no recs)": (r) =>
          r.status === 200 || r.status === 201 || r.status === 400,
      });
      errorRate.add(!ok);
    });

    sleep(2);
  }
}

export function teardown(data) {
  console.log(`Teardown: tested with ${data.machineIds.length} machines`);
}
