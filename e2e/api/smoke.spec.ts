/**
 * Smoke Tests — minimal verification that services are alive.
 *
 * These tests can run in CI before full E2E suite.
 * They verify:
 *   1. API health endpoint responds
 *   2. Swagger docs are served
 *   3. Auth endpoints exist (don't require DB state)
 *   4. CORS headers are set
 */

import { test, expect } from "@playwright/test";

// Uses baseURL from playwright.config.ts (or API_URL env var)

test.describe("Smoke: API Health", () => {
  test("GET /api/v1/health returns 200", async ({ request }) => {
    const res = await request.get(`/api/v1/health`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    // Response wrapped in TransformInterceptor: { success, data: { status } }
    expect(body.success).toBe(true);
  });

  test("GET /api/v1/health response has expected shape", async ({
    request,
  }) => {
    const res = await request.get(`/api/v1/health`);
    const body = await res.json();

    // TransformInterceptor wraps response: { success, data, timestamp }
    expect(body.data).toBeDefined();
    expect(body.data.status).toBe("ok");
  });
});

test.describe("Smoke: Swagger Docs", () => {
  test("GET /docs returns 200 or 401 (JWT-protected in production)", async ({
    request,
  }) => {
    const res = await request.get(`/docs`);
    // In production, Swagger is JWT-protected → 401
    // In development, it's open → 200
    expect([200, 401]).toContain(res.status());
  });

  test("GET /docs-json returns OpenAPI spec or 401", async ({ request }) => {
    const res = await request.get(`/docs-json`);
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("openapi");
      expect(body).toHaveProperty("paths");
      expect(body.info.title).toBeTruthy();
    } else {
      // JWT-protected in production
      expect(res.status()).toBe(401);
    }
  });
});

test.describe("Smoke: Auth Endpoints Exist", () => {
  test("POST /api/v1/auth/login returns 401 without credentials", async ({
    request,
  }) => {
    const res = await request.post(`/api/v1/auth/login`, {
      data: { email: "", password: "" },
    });
    // Should be 400 (validation) or 401 (unauthorized) — not 404
    expect([400, 401]).toContain(res.status());
  });

  test("GET /api/v1/auth/me returns 401 without token", async ({ request }) => {
    const res = await request.get(`/api/v1/auth/me`);
    // Should be 401 (unauthorized) — not 404
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Smoke: Security Headers", () => {
  test("API sets security headers", async ({ request }) => {
    const res = await request.get(`/api/v1/health`);
    const headers = res.headers();

    // Helmet should set these
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBeTruthy();
  });
});
