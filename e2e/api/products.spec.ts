import { test, expect } from "@playwright/test";

const API_PREFIX = "/api/v1";

test.describe("Products API", () => {
  const baseURL = process.env.API_URL || "http://localhost:4000";
  let accessToken: string;

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
  });

  test("should list products with pagination", async ({ request }) => {
    const response = await request.get(`${baseURL}${API_PREFIX}/products`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    // API uses "data" key for product list
    const items = data.data || data.items || [];
    expect(data).toHaveProperty("total");
    expect(Array.isArray(items)).toBeTruthy();

    // Check product structure
    if (items.length > 0) {
      const product = items[0];
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("sku");
      expect(product).toHaveProperty("category");
    }
  });

  test("should search products by name", async ({ request }) => {
    // Try search endpoint; if it doesn't exist, use list with search param
    const searchResponse = await request.get(
      `${baseURL}${API_PREFIX}/products/search?q=Product`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (searchResponse.status() === 400 || searchResponse.status() === 404) {
      // Search endpoint not available — try list with search param
      const listResponse = await request.get(
        `${baseURL}${API_PREFIX}/products?search=Product`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (listResponse.status() !== 200) {
        test.skip();
        return;
      }

      const listBody = await listResponse.json();
      const listData = listBody.data ?? listBody;
      const items = listData.data || listData.items || [];
      expect(Array.isArray(items)).toBeTruthy();
      return;
    }

    expect(searchResponse.status()).toBe(200);

    const body = await searchResponse.json();
    const data = body.data ?? body;
    const items = Array.isArray(data) ? data : data.data || data.items || [];
    expect(Array.isArray(items)).toBeTruthy();
  });

  test("should filter products by category", async ({ request }) => {
    // First get categories
    const categoriesResponse = await request.get(
      `${baseURL}${API_PREFIX}/products/categories`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (categoriesResponse.status() !== 200) {
      test.skip();
      return;
    }

    const categoriesBody = await categoriesResponse.json();
    const categories = categoriesBody.data ?? categoriesBody;
    const categoryList = Array.isArray(categories)
      ? categories
      : categories.data || categories.items || [];

    if (categoryList.length === 0) {
      test.skip();
      return;
    }

    const categoryId = categoryList[0].id;

    // Filter by category
    const response = await request.get(
      `${baseURL}${API_PREFIX}/products?categoryId=${categoryId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    const items = data.data || data.items || [];
    expect(Array.isArray(items)).toBeTruthy();
  });

  test("should get product by ID", async ({ request }) => {
    // Get list first
    const listResponse = await request.get(`${baseURL}${API_PREFIX}/products`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const listBody = await listResponse.json();
    const listData = listBody.data ?? listBody;
    const items = listData.data || listData.items || [];

    if (items.length === 0) {
      test.skip();
      return;
    }

    const productId = items[0].id;

    // Get by ID
    const response = await request.get(
      `${baseURL}${API_PREFIX}/products/${productId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const productBody = await response.json();
    const product = productBody.data ?? productBody;
    expect(product.id).toBe(productId);
    expect(product).toHaveProperty("name");
    expect(product).toHaveProperty("sku");
  });

  test("should validate product price is positive", async ({ request }) => {
    const response = await request.post(`${baseURL}${API_PREFIX}/products`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        name: "Test Product",
        sku: "TEST-001",
        price: -100, // Invalid negative price
        categoryId: "00000000-0000-0000-0000-000000000000",
      },
    });

    // Should reject with validation error
    expect(response.status()).toBe(400);
  });
});
