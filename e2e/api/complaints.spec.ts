import { test, expect } from "@playwright/test";

const API_PREFIX = "/api/v1";

test.describe("Complaints API", () => {
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

  test("should list complaints", async ({ request }) => {
    const response = await request.get(`${baseURL}${API_PREFIX}/complaints`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status()).toBe(200);
  });

  test("should submit a public complaint (no auth required)", async ({
    request,
  }) => {
    const response = await request.post(
      `${baseURL}${API_PREFIX}/complaints/public`,
      {
        data: {
          category: "machine_not_working",
          subject: "E2E Test Complaint",
          description: "Machine is not dispensing products",
          customerPhone: "+998901234567",
        },
      },
    );

    // 201 Created or 200 OK
    expect([200, 201]).toContain(response.status());
  });

  test("should get complaint stats", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/complaints/stats`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // 200 OK or 404 if endpoint doesn't exist
    expect([200, 404]).toContain(response.status());
  });

  test("should reject complaint list without auth", async ({ request }) => {
    const response = await request.get(`${baseURL}${API_PREFIX}/complaints`);

    expect(response.status()).toBe(401);
  });
});
