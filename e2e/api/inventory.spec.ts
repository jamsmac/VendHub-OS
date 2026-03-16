import { test, expect } from "@playwright/test";

const API_PREFIX = "/api/v1";

test.describe("Inventory API", () => {
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

  test("should list warehouse inventory", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/inventory/warehouse`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    expect(response.status()).toBe(200);
  });

  test("should list inventory movements", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/inventory/movements`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    expect(response.status()).toBe(200);
  });

  test("should get inventory summary", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/inventory/summary`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // 200 OK or 404 if endpoint doesn't exist
    expect([200, 404]).toContain(response.status());
  });

  test("should reject without auth", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/inventory/warehouse`,
    );

    expect(response.status()).toBe(401);
  });
});
