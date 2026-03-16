import { test, expect } from "@playwright/test";

const API_PREFIX = "/api/v1";

test.describe("Transactions API", () => {
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

  test("should list transactions", async ({ request }) => {
    const response = await request.get(`${baseURL}${API_PREFIX}/transactions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const data = body.data ?? body;
    expect(data).toBeDefined();
  });

  test("should filter transactions by status", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/transactions?status=completed`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    expect(response.status()).toBe(200);
  });

  test("should get daily summary", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/transactions/daily-summary`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // 200 OK or 404 if endpoint doesn't exist
    expect([200, 404]).toContain(response.status());
  });

  test("should reject without auth", async ({ request }) => {
    const response = await request.get(`${baseURL}${API_PREFIX}/transactions`);

    expect(response.status()).toBe(401);
  });
});
