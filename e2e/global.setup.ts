import { test as setup, expect, request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ADMIN_AUTH_FILE = 'playwright/.auth/admin.json';
const USER_AUTH_FILE = 'playwright/.auth/user.json';

/**
 * Global setup - authenticate admin and user before tests
 */
setup('authenticate admin', async () => {
  const apiContext = await request.newContext({
    baseURL: process.env.API_URL || 'http://localhost:4000',
  });

  // Login as admin
  const adminResponse = await apiContext.post('/auth/login', {
    data: {
      email: 'admin@vendhub.uz',
      password: 'demo123456',
    },
  });

  expect(adminResponse.ok()).toBeTruthy();
  const adminData = await adminResponse.json();

  // Ensure directory exists
  const authDir = path.dirname(ADMIN_AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Save admin auth state
  await fs.promises.writeFile(
    ADMIN_AUTH_FILE,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: process.env.WEB_URL || 'http://localhost:3000',
          localStorage: [
            {
              name: 'accessToken',
              value: adminData.accessToken,
            },
            {
              name: 'refreshToken',
              value: adminData.refreshToken,
            },
            {
              name: 'user',
              value: JSON.stringify(adminData.user),
            },
          ],
        },
      ],
    })
  );

  await apiContext.dispose();
});

setup('authenticate user', async () => {
  const apiContext = await request.newContext({
    baseURL: process.env.API_URL || 'http://localhost:4000',
  });

  // For Mini App, we may use Telegram auth or a test user
  // Here we create a test customer or use existing one
  const userResponse = await apiContext.post('/auth/login', {
    data: {
      email: 'customer@vendhub.uz',
      password: 'customer123',
    },
  });

  // If customer doesn't exist, the test will still pass
  // as Mini App may use anonymous sessions
  if (userResponse.ok()) {
    const userData = await userResponse.json();

    const authDir = path.dirname(USER_AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await fs.promises.writeFile(
      USER_AUTH_FILE,
      JSON.stringify({
        cookies: [],
        origins: [
          {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            localStorage: [
              {
                name: 'accessToken',
                value: userData.accessToken,
              },
              {
                name: 'user',
                value: JSON.stringify(userData.user),
              },
            ],
          },
        ],
      })
    );
  } else {
    // Create empty auth file for anonymous session
    const authDir = path.dirname(USER_AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await fs.promises.writeFile(
      USER_AUTH_FILE,
      JSON.stringify({
        cookies: [],
        origins: [],
      })
    );
  }

  await apiContext.dispose();
});
