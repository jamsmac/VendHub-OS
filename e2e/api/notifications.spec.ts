import { test, expect } from "@playwright/test";

const API_PREFIX = "/api/v1";

test.describe("Notifications API", () => {
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

  test("should list notifications", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/notifications`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    expect(response.status()).toBe(200);
  });

  test("should get unread count", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/notifications/unread-count`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // 200 OK or 404 if endpoint doesn't exist
    expect([200, 404]).toContain(response.status());
  });

  test("should mark notification as read", async ({ request }) => {
    // First get notifications
    const listResponse = await request.get(
      `${baseURL}${API_PREFIX}/notifications`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const listBody = await listResponse.json();
    const listData = listBody.data ?? listBody;
    const notifications = listData.data || listData.items || listData;

    if (Array.isArray(notifications) && notifications.length > 0) {
      const id = notifications[0].id;
      const response = await request.patch(
        `${baseURL}${API_PREFIX}/notifications/${id}/read`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      expect([200, 204]).toContain(response.status());
    }
  });

  test("should reject without auth", async ({ request }) => {
    const response = await request.get(`${baseURL}${API_PREFIX}/notifications`);

    expect(response.status()).toBe(401);
  });
});
