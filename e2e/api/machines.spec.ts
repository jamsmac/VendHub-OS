import { test, expect } from '@playwright/test';

test.describe('Machines API', () => {
  const baseURL = process.env.API_URL || 'http://localhost:4000';
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get access token
    const response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'admin@vendhub.uz',
        password: 'demo123456',
      },
    });

    const data = await response.json();
    accessToken = data.accessToken;
  });

  test('should list machines with pagination', async ({ request }) => {
    const response = await request.get(`${baseURL}/machines?page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('limit');
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test('should filter machines by status', async ({ request }) => {
    const response = await request.get(`${baseURL}/machines?status=online`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('items');

    // All returned machines should be online
    for (const machine of data.items) {
      expect(machine.status).toBe('online');
    }
  });

  test('should get machine by ID', async ({ request }) => {
    // First get list to get a machine ID
    const listResponse = await request.get(`${baseURL}/machines?limit=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const listData = await listResponse.json();

    if (listData.items.length === 0) {
      test.skip();
      return;
    }

    const machineId = listData.items[0].id;

    // Get machine by ID
    const response = await request.get(`${baseURL}/machines/${machineId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const machine = await response.json();
    expect(machine.id).toBe(machineId);
    expect(machine).toHaveProperty('name');
    expect(machine).toHaveProperty('serialNumber');
    expect(machine).toHaveProperty('status');
    expect(machine).toHaveProperty('location');
  });

  test('should find nearby machines', async ({ request }) => {
    // Tashkent coordinates
    const lat = 41.311081;
    const lng = 69.279737;
    const radius = 10000; // 10km

    const response = await request.get(
      `${baseURL}/machines/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();

    // Each machine should have distance
    for (const machine of data) {
      expect(machine).toHaveProperty('distance');
      expect(machine.distance).toBeLessThanOrEqual(radius);
    }
  });

  test('should return 404 for non-existent machine', async ({ request }) => {
    const response = await request.get(
      `${baseURL}/machines/00000000-0000-0000-0000-000000000000`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(response.status()).toBe(404);
  });
});
