import { test, expect } from '@playwright/test';

test.describe('Admin Panel Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Reset auth

  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // Check form elements
    await expect(page.getByRole('heading', { name: /вход|login/i })).toBeVisible();
    await expect(page.getByLabel(/email|почта/i)).toBeVisible();
    await expect(page.getByLabel(/пароль|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /войти|login|sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');

    // Click submit without filling form
    await page.getByRole('button', { name: /войти|login|sign in/i }).click();

    // Should show validation errors
    await expect(page.getByText(/email|почта/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with invalid credentials
    await page.getByLabel(/email|почта/i).fill('invalid@test.com');
    await page.getByLabel(/пароль|password/i).fill('wrongpassword');

    // Submit
    await page.getByRole('button', { name: /войти|login|sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/неверный|invalid|ошибка|error/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with valid credentials
    await page.getByLabel(/email|почта/i).fill('admin@vendhub.uz');
    await page.getByLabel(/пароль|password/i).fill('demo123456');

    // Submit
    await page.getByRole('button', { name: /войти|login|sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/i, { timeout: 10000 });

    // Should show dashboard content
    await expect(page.getByText(/панель|dashboard|главная/i)).toBeVisible();
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/i, { timeout: 10000 });
  });
});
