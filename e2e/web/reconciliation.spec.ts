import { test, expect } from "@playwright/test";

test.describe("Admin Reconciliation Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/reconciliation");
  });

  test("should display reconciliation page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /сверка|reconciliation|инкассация|collection/i,
      }),
    ).toBeVisible();
  });

  test("should show reconciliation data", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
