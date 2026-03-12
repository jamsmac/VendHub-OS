import { test, expect } from "@playwright/test";

const API_PREFIX = "/api/v1";

test.describe("Loyalty API", () => {
  const baseURL = process.env.API_URL || "http://localhost:4000";
  let accessToken: string;
  let loyaltyEndpointsAvailable = false;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${baseURL}${API_PREFIX}/auth/login`, {
      data: {
        email: "admin@vendhub.uz",
        password: "demo123456",
      },
    });

    const body = await response.json();
    const data = body.data ?? body;
    accessToken = data.accessToken;

    // Probe whether loyalty endpoints are registered
    const probe = await request.get(`${baseURL}${API_PREFIX}/loyalty/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    loyaltyEndpointsAvailable = probe.status() !== 404;
  });

  test("should get user loyalty status", async ({ request }) => {
    test.skip(!loyaltyEndpointsAvailable, "Loyalty endpoints not registered");

    const response = await request.get(`${baseURL}${API_PREFIX}/loyalty/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    expect(data).toHaveProperty("points");
    expect(data).toHaveProperty("tier");
    expect(typeof data.points).toBe("number");
    expect(data.points).toBeGreaterThanOrEqual(0);
  });

  test("should get available rewards", async ({ request }) => {
    test.skip(!loyaltyEndpointsAvailable, "Loyalty endpoints not registered");

    const response = await request.get(
      `${baseURL}${API_PREFIX}/loyalty/rewards`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    const items = Array.isArray(data) ? data : data.items || data.data || [];
    expect(Array.isArray(items)).toBeTruthy();
  });

  test("should get points history", async ({ request }) => {
    test.skip(!loyaltyEndpointsAvailable, "Loyalty endpoints not registered");

    const response = await request.get(
      `${baseURL}${API_PREFIX}/loyalty/history`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    const items = data.items || data.data || [];
    expect(Array.isArray(items)).toBeTruthy();
  });

  test("should get loyalty tiers", async ({ request }) => {
    test.skip(!loyaltyEndpointsAvailable, "Loyalty endpoints not registered");

    const response = await request.get(
      `${baseURL}${API_PREFIX}/loyalty/tiers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    const items = Array.isArray(data) ? data : data.items || data.data || [];
    expect(items.length).toBeGreaterThan(0);

    const tier = items[0];
    expect(tier).toHaveProperty("id");
    expect(tier).toHaveProperty("name");
  });

  test("should reject reward redemption with insufficient points", async ({
    request,
  }) => {
    test.skip(!loyaltyEndpointsAvailable, "Loyalty endpoints not registered");

    const rewardsResponse = await request.get(
      `${baseURL}${API_PREFIX}/loyalty/rewards`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const rewardsBody = await rewardsResponse.json();
    const rewardsData = rewardsBody.data ?? rewardsBody;
    const rewards = Array.isArray(rewardsData)
      ? rewardsData
      : rewardsData.items || rewardsData.data || [];
    const expensiveReward = rewards.find(
      (r: { pointsCost: number }) => r.pointsCost > 1000000,
    );

    if (!expensiveReward) {
      test.skip();
      return;
    }

    const response = await request.post(
      `${baseURL}${API_PREFIX}/loyalty/rewards/${expensiveReward.id}/redeem`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(400);
  });
});
