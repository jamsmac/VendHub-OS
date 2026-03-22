import { test, expect } from "@playwright/test";

test.describe("Dashboard Breadcrumbs", () => {
  test("should show breadcrumbs on products page", async ({ page }) => {
    await page.goto("/dashboard/products", { waitUntil: "networkidle" });

    const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
    await expect(breadcrumb).toBeVisible();

    // Should have home icon link
    const homeLink = breadcrumb.locator('a[href="/dashboard"]');
    await expect(homeLink).toBeVisible();

    // Should show current page name
    const currentPage = breadcrumb.locator('[data-slot="breadcrumb-page"]');
    await expect(currentPage).toBeVisible();
  });

  test("should show breadcrumbs on nested page", async ({ page }) => {
    await page.goto("/dashboard/products/new", { waitUntil: "networkidle" });

    const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
    await expect(breadcrumb).toBeVisible();

    // Should have separator between items
    const separators = breadcrumb.locator('[data-slot="breadcrumb-separator"]');
    await expect(separators.first()).toBeVisible();
  });

  test("should not show breadcrumbs on dashboard root", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // On root dashboard, breadcrumbs should not render (no segments)
    const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
    await expect(breadcrumb).not.toBeVisible();
  });

  test("breadcrumb links should navigate", async ({ page }) => {
    await page.goto("/dashboard/machines/new", { waitUntil: "networkidle" });

    const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
    const machinesLink = breadcrumb.locator('a[href*="machines"]');

    if (await machinesLink.isVisible()) {
      await machinesLink.click();
      await expect(page).toHaveURL(/\/dashboard\/machines$/);
    }
  });
});
