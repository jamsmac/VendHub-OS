import { defineConfig, devices } from '@playwright/test';

/**
 * VendHub E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for API tests */
    baseURL: process.env.API_URL || 'http://localhost:4000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project - runs before all tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // API Tests
    {
      name: 'api',
      testDir: './e2e/api',
      use: {
        baseURL: process.env.API_URL || 'http://localhost:4000',
      },
    },

    // Admin Panel (Web) Tests
    {
      name: 'web-chromium',
      testDir: './e2e/web',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.WEB_URL || 'http://localhost:3000',
        storageState: 'playwright/.auth/admin.json',
      },
    },

    // Mobile Mini App Tests
    {
      name: 'client-mobile',
      testDir: './e2e/client',
      dependencies: ['setup'],
      use: {
        ...devices['iPhone 14'],
        baseURL: process.env.CLIENT_URL || 'http://localhost:5173',
        storageState: 'playwright/.auth/user.json',
      },
    },

    // Mobile Mini App Tests - Android
    {
      name: 'client-android',
      testDir: './e2e/client',
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 7'],
        baseURL: process.env.CLIENT_URL || 'http://localhost:5173',
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],

  /* Global timeout */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 5000,
  },

  /* Run local dev servers before starting the tests */
  webServer: process.env.CI ? undefined : [
    {
      command: 'pnpm --filter api start:dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'pnpm --filter web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'pnpm --filter client dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
