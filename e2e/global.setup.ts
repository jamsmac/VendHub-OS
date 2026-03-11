import { test as setup, request } from "@playwright/test";
import fs from "fs";
import path from "path";

const ADMIN_AUTH_FILE = "playwright/.auth/admin.json";
const USER_AUTH_FILE = "playwright/.auth/user.json";

const API_PREFIX = "/api/v1";

/**
 * Global setup - authenticate admin and user before tests
 */
setup("authenticate admin", async () => {
  const apiContext = await request.newContext({
    baseURL: process.env.API_URL || "http://localhost:4000",
  });

  // Login as admin
  const adminResponse = await apiContext.post(`${API_PREFIX}/auth/login`, {
    data: {
      email: "admin@vendhub.uz",
      password: "demo123456",
    },
  });

  const authDir = path.dirname(ADMIN_AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  if (adminResponse.ok()) {
    const adminData = await adminResponse.json();

    // Save admin auth state
    // Web app uses vendhub_access_token / vendhub_refresh_token keys
    await fs.promises.writeFile(
      ADMIN_AUTH_FILE,
      JSON.stringify({
        cookies: [],
        origins: [
          {
            origin: process.env.WEB_URL || "http://localhost:3000",
            localStorage: [
              {
                name: "vendhub_access_token",
                value: adminData.accessToken,
              },
              {
                name: "vendhub_refresh_token",
                value: adminData.refreshToken,
              },
            ],
          },
        ],
      }),
    );
  } else {
    // Create empty auth file — tests will run without auth
    // (pages may redirect to login, but smoke tests still verify rendering)
    await fs.promises.writeFile(
      ADMIN_AUTH_FILE,
      JSON.stringify({
        cookies: [],
        origins: [],
      }),
    );
  }

  await apiContext.dispose();
});

setup("authenticate user", async () => {
  const apiContext = await request.newContext({
    baseURL: process.env.API_URL || "http://localhost:4000",
  });

  // For Mini App, we may use Telegram auth or a test user
  const userResponse = await apiContext.post(`${API_PREFIX}/auth/login`, {
    data: {
      email: "customer@vendhub.uz",
      password: "customer123",
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
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            localStorage: [
              {
                name: "vendhub_access_token",
                value: userData.accessToken,
              },
              {
                name: "vendhub_refresh_token",
                value: userData.refreshToken,
              },
            ],
          },
        ],
      }),
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
      }),
    );
  }

  await apiContext.dispose();
});
