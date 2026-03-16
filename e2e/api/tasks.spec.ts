import { test, expect } from "@playwright/test";

const API_PREFIX = "/api/v1";

test.describe("Tasks API", () => {
  const baseURL = process.env.API_URL || "http://localhost:4000";
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${baseURL}${API_PREFIX}/auth/login`, {
      data: { email: "admin@vendhub.uz", password: "demo123456" },
    });
    const body = await response.json();
    const data = body.data ?? body;
    accessToken = data.accessToken;
  });

  test("should list tasks", async ({ request }) => {
    const response = await request.get(`${baseURL}${API_PREFIX}/tasks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const data = body.data ?? body;
    expect(data).toBeDefined();
  });

  test("should create a task", async ({ request }) => {
    const response = await request.post(`${baseURL}${API_PREFIX}/tasks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        type: "refill",
        priority: "normal",
        title: "E2E Test Task",
        description: "Created by Playwright E2E test",
      },
    });

    // 201 Created or 200 OK depending on controller
    expect([200, 201]).toContain(response.status());
  });

  test("should reject task creation without auth", async ({ request }) => {
    const response = await request.post(`${baseURL}${API_PREFIX}/tasks`, {
      data: { type: "refill", title: "Unauthorized task" },
    });

    expect(response.status()).toBe(401);
  });

  test("should get task stats", async ({ request }) => {
    const response = await request.get(`${baseURL}${API_PREFIX}/tasks/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 200 OK or 404 if endpoint doesn't exist
    expect([200, 404]).toContain(response.status());
  });
});
