import { test, expect } from '@playwright/test';

test.describe('Loyalty API', () => {
  const baseURL = process.env.API_URL || 'http://localhost:4000';
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'admin@vendhub.uz',
        password: 'demo123456',
      },
    });

    const data = await response.json();
    accessToken = data.accessToken;
  });

  test('should get user loyalty status', async ({ request }) => {
    const response = await request.get(`${baseURL}/loyalty/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('points');
    expect(data).toHaveProperty('tier');
    expect(data).toHaveProperty('lifetimePoints');
    expect(typeof data.points).toBe('number');
    expect(data.points).toBeGreaterThanOrEqual(0);
  });

  test('should get available rewards', async ({ request }) => {
    const response = await request.get(`${baseURL}/loyalty/rewards`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();

    if (data.length > 0) {
      const reward = data[0];
      expect(reward).toHaveProperty('id');
      expect(reward).toHaveProperty('name');
      expect(reward).toHaveProperty('pointsCost');
      expect(reward).toHaveProperty('type');
    }
  });

  test('should get points history', async ({ request }) => {
    const response = await request.get(`${baseURL}/loyalty/history`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBeTruthy();

    if (data.items.length > 0) {
      const transaction = data.items[0];
      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('points');
      expect(transaction).toHaveProperty('type');
      expect(transaction).toHaveProperty('createdAt');
    }
  });

  test('should get loyalty tiers', async ({ request }) => {
    const response = await request.get(`${baseURL}/loyalty/tiers`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThan(0);

    // Check tier structure
    const tier = data[0];
    expect(tier).toHaveProperty('id');
    expect(tier).toHaveProperty('name');
    expect(tier).toHaveProperty('minPoints');
    expect(tier).toHaveProperty('multiplier');
  });

  test('should reject reward redemption with insufficient points', async ({ request }) => {
    // First get a reward that costs more than 0
    const rewardsResponse = await request.get(`${baseURL}/loyalty/rewards`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const rewards = await rewardsResponse.json();
    const expensiveReward = rewards.find((r: any) => r.pointsCost > 1000000);

    if (!expensiveReward) {
      test.skip();
      return;
    }

    const response = await request.post(`${baseURL}/loyalty/rewards/${expensiveReward.id}/redeem`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Should fail due to insufficient points
    expect(response.status()).toBe(400);
  });
});
