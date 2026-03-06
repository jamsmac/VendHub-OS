import { test, expect } from "@playwright/test";

test.describe("Promotions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/promotions");
  });

  test("should display promotions page header", async ({ page }) => {
    await expect(page.getByText(/акции.*промо/i).first()).toBeVisible();
  });

  test("should show promotion cards", async ({ page }) => {
    // KPI cards should be visible
    await expect(page.getByText(/активных/i).first()).toBeVisible();
  });

  test("should show tab navigation", async ({ page }) => {
    await expect(page.getByText(/акции/i).first()).toBeVisible();
    await expect(page.getByText(/аналитика/i).first()).toBeVisible();
    await expect(page.getByText(/купоны/i).first()).toBeVisible();
  });

  test("should switch to analytics tab", async ({ page }) => {
    await page
      .getByText(/аналитика/i)
      .first()
      .click();

    // Should show chart
    await expect(page.locator(".recharts-wrapper").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should switch to create promotion wizard", async ({ page }) => {
    await page
      .getByText(/создать акцию/i)
      .first()
      .click();

    // Wizard form should appear
    await expect(
      page.getByText(/название акции|тип скидки/i).first(),
    ).toBeVisible();
  });
});
