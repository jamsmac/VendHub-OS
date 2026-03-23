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

const API_URL = process.env.API_URL || "http://localhost:4000";

test.describe("Smoke: API Health", () => {
  test("GET /api/v1/health returns 200", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/health`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("status");
  });

  test("GET /api/v1/health response has expected shape", async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/api/v1/health`);
    const body = await res.json();

    // TerminusModule health check shape
    expect(body.status).toBe("ok");
    if (body.info) {
      expect(typeof body.info).toBe("object");
    }
  });
});

test.describe("Smoke: Swagger Docs", () => {
  test("GET /docs returns HTML", async ({ request }) => {
    const res = await request.get(`${API_URL}/docs`);
    expect(res.status()).toBe(200);

    const contentType = res.headers()["content-type"];
    expect(contentType).toContain("text/html");
  });

  test("GET /docs-json returns OpenAPI spec", async ({ request }) => {
    const res = await request.get(`${API_URL}/docs-json`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("openapi");
    expect(body).toHaveProperty("paths");
    expect(body).toHaveProperty("info");
    expect(body.info.title).toBeTruthy();
  });
});

test.describe("Smoke: Auth Endpoints Exist", () => {
  test("POST /api/v1/auth/login returns 401 without credentials", async ({
    request,
  }) => {
    const res = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: "", password: "" },
    });
    // Should be 400 (validation) or 401 (unauthorized) — not 404
    expect([400, 401]).toContain(res.status());
  });

  test("GET /api/v1/auth/profile returns 401 without token", async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/api/v1/auth/profile`);
    expect(res.status()).toBe(401);
  });
});

test.describe("Smoke: Security Headers", () => {
  test("API sets security headers", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/health`);
    const headers = res.headers();

    // Helmet should set these
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBeTruthy();
  });
});
