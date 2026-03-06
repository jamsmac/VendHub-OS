import { test, expect } from "@playwright/test";

test.describe("Finance Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/finance");
  });

  test("should display finance page header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /финансы/i })).toBeVisible();
  });

  test("should show tab navigation", async ({ page }) => {
    await expect(page.getByText(/обзор|overview/i).first()).toBeVisible();
    await expect(page.getByText(/транзакции/i).first()).toBeVisible();
    await expect(page.getByText(/бюджет/i).first()).toBeVisible();
  });

  test("should show KPI cards in overview", async ({ page }) => {
    // Overview tab should be active by default
    await expect(page.getByText(/выручка/i).first()).toBeVisible();
    await expect(page.getByText(/расходы/i).first()).toBeVisible();
  });

  test("should switch to transactions tab", async ({ page }) => {
    await page
      .getByText(/транзакции/i)
      .first()
      .click();

    // Should show search and filters
    await expect(page.getByPlaceholder(/поиск|search/i).first()).toBeVisible();
  });

  test("should switch to P&L tab", async ({ page }) => {
    await page.getByText("P&L").first().click();

    // Should show P&L data
    await expect(page.locator(".recharts-wrapper").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should open new transaction form", async ({ page }) => {
    await page.getByRole("button", { name: /транзакция/i }).click();

    // Modal should appear
    await expect(
      page.getByText(/новая транзакция|создать/i).first(),
    ).toBeVisible();
  });
});
