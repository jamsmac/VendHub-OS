import { test, expect } from "@playwright/test";

test.describe("Admin Panel Login", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Reset auth

  test("should display login form", async ({ page }) => {
    await page.goto("/auth");

    // Check form elements
    await expect(
      page.getByRole("heading", { name: /vendhub|admin/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/пароль|password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /войти|login|sign in/i }),
    ).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    await page.goto("/auth");

    // Click submit without filling form
    await page.getByRole("button", { name: /войти|login|sign in/i }).click();

    // Should show validation errors
    await expect(page.getByText(/email|почта/i)).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/auth");

    // Fill with invalid credentials
    await page.getByLabel(/email/i).fill("invalid@test.com");
    await page.getByLabel(/пароль|password/i).fill("wrongpassword123");

    // Submit
    await page.getByRole("button", { name: /войти|login|sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/неверный|invalid|ошибка|error/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/auth");

    // Fill with valid credentials
    await page.getByLabel(/email/i).fill("admin@vendhub.uz");
    await page.getByLabel(/пароль|password/i).fill("demo123456");

    // Submit
    await page.getByRole("button", { name: /войти|login|sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/i, { timeout: 10000 });

    // Should show dashboard content
    await expect(page.getByText(/обзор|dashboard|панель/i)).toBeVisible();
  });

  test("should redirect to auth when accessing protected route without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Should redirect to auth
    await expect(page).toHaveURL(/auth/i, { timeout: 10000 });
  });

  test("should show forgot password link", async ({ page }) => {
    await page.goto("/auth");

    await expect(
      page.getByText(/забыли пароль|forgot password/i),
    ).toBeVisible();
  });

  test("should toggle password visibility", async ({ page }) => {
    await page.goto("/auth");

    const passwordInput = page.getByLabel(/пароль|password/i);
    await passwordInput.fill("testpassword");

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click eye icon to toggle visibility
    const toggleButton = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .last();
    await toggleButton.click();

    // Password should be visible now
    await expect(passwordInput).toHaveAttribute("type", "text");
  });
});
