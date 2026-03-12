import { test as setup, request } from "@playwright/test";
import fs from "fs";
import path from "path";

const ADMIN_AUTH_FILE = "playwright/.auth/admin.json";
const USER_AUTH_FILE = "playwright/.auth/user.json";

const API_PREFIX = "/api/v1";

/**
 * Global setup - authenticate admin and user before tests
 *
 * Web app auth flow:
 * 1. Zustand persist stores { user, isAuthenticated } under "vendhub-auth" key
 * 2. In-memory _accessToken holds the JWT (lost on refresh)
 * 3. Dashboard layout checks getAccessToken() first, then falls back to checkAuth()
 *
 * We set both: Zustand state in localStorage + access token for init script injection.
 */
setup("authenticate admin", async () => {
  const apiContext = await request.newContext({
    baseURL: process.env.API_URL || "http://localhost:4000",
  });

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

  const webOrigin = process.env.WEB_URL || "http://localhost:3000";

  if (adminResponse.ok()) {
    const adminBody = await adminResponse.json();
    // API wraps responses in { success, data, timestamp } envelope
    const adminData = adminBody.data ?? adminBody;

    // Zustand persist state — the web app reads this on hydration
    const zustandState = JSON.stringify({
      state: {
        user: adminData.user,
        isAuthenticated: true,
        isLoading: false,
      },
      version: 0,
    });

    await fs.promises.writeFile(
      ADMIN_AUTH_FILE,
      JSON.stringify({
        cookies: [],
        origins: [
          {
            origin: webOrigin,
            localStorage: [
              {
                name: "vendhub-auth",
                value: zustandState,
              },
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

  const userResponse = await apiContext.post(`${API_PREFIX}/auth/login`, {
    data: {
      email: "customer@vendhub.uz",
      password: "customer123",
    },
  });

  const authDir = path.dirname(USER_AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";

  if (userResponse.ok()) {
    const userBody = await userResponse.json();
    const userData = userBody.data ?? userBody;

    const zustandState = JSON.stringify({
      state: {
        user: userData.user,
        isAuthenticated: true,
        isLoading: false,
      },
      version: 0,
    });

    await fs.promises.writeFile(
      USER_AUTH_FILE,
      JSON.stringify({
        cookies: [],
        origins: [
          {
            origin: clientOrigin,
            localStorage: [
              {
                name: "vendhub-auth",
                value: zustandState,
              },
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
