import { test, expect } from '@playwright/test';

test.describe('Products API', () => {
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

  test('should list products with pagination', async ({ request }) => {
    const response = await request.get(`${baseURL}/products?page=1&limit=20`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.items)).toBeTruthy();

    // Check product structure
    if (data.items.length > 0) {
      const product = data.items[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('sku');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('category');
    }
  });

  test('should search products by name', async ({ request }) => {
    const response = await request.get(`${baseURL}/products/search?q=кофе`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();

    // Results should contain search term
    for (const product of data) {
      const name = product.name.toLowerCase();
      const description = (product.description || '').toLowerCase();
      const matchFound = name.includes('кофе') || description.includes('кофе');
      // Search might also match category or tags
      expect(matchFound || product.category?.toLowerCase().includes('кофе')).toBeTruthy();
    }
  });

  test('should filter products by category', async ({ request }) => {
    // First get categories
    const categoriesResponse = await request.get(`${baseURL}/products/categories`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (categoriesResponse.status() !== 200) {
      test.skip();
      return;
    }

    const categories = await categoriesResponse.json();

    if (categories.length === 0) {
      test.skip();
      return;
    }

    const categoryId = categories[0].id;

    // Filter by category
    const response = await request.get(`${baseURL}/products?categoryId=${categoryId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('items');

    // All products should belong to the category
    for (const product of data.items) {
      expect(product.categoryId).toBe(categoryId);
    }
  });

  test('should get product by ID', async ({ request }) => {
    // Get list first
    const listResponse = await request.get(`${baseURL}/products?limit=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const listData = await listResponse.json();

    if (listData.items.length === 0) {
      test.skip();
      return;
    }

    const productId = listData.items[0].id;

    // Get by ID
    const response = await request.get(`${baseURL}/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const product = await response.json();
    expect(product.id).toBe(productId);
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('nutritionalInfo');
  });

  test('should validate product price is positive', async ({ request }) => {
    const response = await request.post(`${baseURL}/products`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        name: 'Test Product',
        sku: 'TEST-001',
        price: -100, // Invalid negative price
        categoryId: '00000000-0000-0000-0000-000000000000',
      },
    });

    // Should reject with validation error
    expect(response.status()).toBe(400);
  });
});
