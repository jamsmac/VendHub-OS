import { test, expect } from '@playwright/test';

test.describe('Orders API', () => {
  const baseURL = process.env.API_URL || 'http://localhost:4000';
  let accessToken: string;
  let testMachineId: string;
  let testProductId: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'admin@vendhub.uz',
        password: 'demo123456',
      },
    });

    const data = await response.json();
    accessToken = data.accessToken;

    // Get a machine for testing
    const machinesResponse = await request.get(`${baseURL}/machines?limit=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const machinesData = await machinesResponse.json();
    if (machinesData.items?.length > 0) {
      testMachineId = machinesData.items[0].id;
    }

    // Get a product for testing
    const productsResponse = await request.get(`${baseURL}/products?limit=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const productsData = await productsResponse.json();
    if (productsData.items?.length > 0) {
      testProductId = productsData.items[0].id;
    }
  });

  test('should list orders with pagination', async ({ request }) => {
    const response = await request.get(`${baseURL}/orders?page=1&limit=20`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test('should filter orders by status', async ({ request }) => {
    const response = await request.get(`${baseURL}/orders?status=completed`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('items');

    for (const order of data.items) {
      expect(order.status).toBe('completed');
    }
  });

  test('should filter orders by date range', async ({ request }) => {
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';

    const response = await request.get(
      `${baseURL}/orders?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('items');

    for (const order of data.items) {
      const orderDate = new Date(order.createdAt);
      expect(orderDate >= new Date(startDate)).toBeTruthy();
      expect(orderDate <= new Date(endDate + 'T23:59:59')).toBeTruthy();
    }
  });

  test('should create order successfully', async ({ request }) => {
    if (!testMachineId || !testProductId) {
      test.skip();
      return;
    }

    const response = await request.post(`${baseURL}/orders`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        machineId: testMachineId,
        items: [
          {
            productId: testProductId,
            quantity: 1,
            price: 15000,
          },
        ],
        paymentMethod: 'payme',
        totalAmount: 15000,
      },
    });

    // May return 201 Created or 200 OK
    expect([200, 201]).toContain(response.status());

    const order = await response.json();
    expect(order).toHaveProperty('id');
    expect(order).toHaveProperty('orderNumber');
    expect(order.machineId).toBe(testMachineId);
    expect(order.items).toHaveLength(1);
    expect(order.totalAmount).toBe(15000);
  });

  test('should reject order with invalid machine', async ({ request }) => {
    const response = await request.post(`${baseURL}/orders`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        machineId: '00000000-0000-0000-0000-000000000000',
        items: [
          {
            productId: testProductId || '00000000-0000-0000-0000-000000000000',
            quantity: 1,
            price: 15000,
          },
        ],
        paymentMethod: 'payme',
        totalAmount: 15000,
      },
    });

    // Should return 404 or 400
    expect([400, 404]).toContain(response.status());
  });

  test('should reject order with empty items', async ({ request }) => {
    if (!testMachineId) {
      test.skip();
      return;
    }

    const response = await request.post(`${baseURL}/orders`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        machineId: testMachineId,
        items: [],
        paymentMethod: 'payme',
        totalAmount: 0,
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should get order by ID', async ({ request }) => {
    // Get list first
    const listResponse = await request.get(`${baseURL}/orders?limit=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const listData = await listResponse.json();

    if (listData.items.length === 0) {
      test.skip();
      return;
    }

    const orderId = listData.items[0].id;

    // Get by ID
    const response = await request.get(`${baseURL}/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const order = await response.json();
    expect(order.id).toBe(orderId);
    expect(order).toHaveProperty('orderNumber');
    expect(order).toHaveProperty('items');
    expect(order).toHaveProperty('totalAmount');
    expect(order).toHaveProperty('status');
  });
});
