import { test, expect } from "@playwright/test";

test.describe("Investor Portal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/investor");
  });

  test("should display investor portal header", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /портал инвестора/i }),
    ).toBeVisible();
  });

  test("should show investor KPI cards", async ({ page }) => {
    await expect(page.getByText(/выручка.*YTD/i).first()).toBeVisible();
    await expect(page.getByText(/чистая прибыль/i).first()).toBeVisible();
    await expect(page.getByText(/автоматов/i).first()).toBeVisible();
  });

  test("should have tab navigation", async ({ page }) => {
    await expect(page.getByText(/обзор/i).first()).toBeVisible();
    await expect(page.getByText(/финансы/i).first()).toBeVisible();
    await expect(page.getByText(/локации/i).first()).toBeVisible();
  });

  test("should display charts", async ({ page }) => {
    await expect(page.locator(".recharts-wrapper").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should switch to finances tab", async ({ page }) => {
    await page
      .getByText(/финансы/i)
      .first()
      .click();

    // Should show asset allocation
    await expect(page.getByText(/активы|дивиденд/i).first()).toBeVisible();
  });
});
