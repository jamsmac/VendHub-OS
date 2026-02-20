import { test, expect } from '@playwright/test';

test.describe('Auth API', () => {
  const baseURL = process.env.API_URL || 'http://localhost:4000';

  test('should login successfully with valid credentials', async ({ request }) => {
    const response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'admin@vendhub.uz',
        password: 'demo123456',
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('accessToken');
    expect(data).toHaveProperty('refreshToken');
    expect(data).toHaveProperty('user');
    expect(data.user.email).toBe('admin@vendhub.uz');
  });

  test('should reject login with invalid credentials', async ({ request }) => {
    const response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'admin@vendhub.uz',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject login with invalid email format', async ({ request }) => {
    const response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'not-an-email',
        password: 'password123',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should get profile with valid token', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'admin@vendhub.uz',
        password: 'demo123456',
      },
    });

    const loginData = await loginResponse.json();

    // Get profile
    const profileResponse = await request.get(`${baseURL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${loginData.accessToken}`,
      },
    });

    expect(profileResponse.status()).toBe(200);

    const profile = await profileResponse.json();
    expect(profile.email).toBe('admin@vendhub.uz');
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('role');
  });

  test('should reject profile request without token', async ({ request }) => {
    const response = await request.get(`${baseURL}/auth/me`);

    expect(response.status()).toBe(401);
  });

  test('should refresh token successfully', async ({ request }) => {
    // First login to get tokens
    const loginResponse = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'admin@vendhub.uz',
        password: 'demo123456',
      },
    });

    const loginData = await loginResponse.json();

    // Refresh token
    const refreshResponse = await request.post(`${baseURL}/auth/refresh`, {
      data: {
        refreshToken: loginData.refreshToken,
      },
    });

    expect(refreshResponse.status()).toBe(200);

    const refreshData = await refreshResponse.json();
    expect(refreshData).toHaveProperty('accessToken');
    expect(refreshData).toHaveProperty('refreshToken');
    // New tokens should be different
    expect(refreshData.accessToken).not.toBe(loginData.accessToken);
  });

  test('should reject refresh with invalid token', async ({ request }) => {
    const response = await request.post(`${baseURL}/auth/refresh`, {
      data: {
        refreshToken: 'invalid-token',
      },
    });

    expect(response.status()).toBe(401);
  });
});
