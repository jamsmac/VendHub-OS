import { test, expect } from "@playwright/test";

test.describe("Admin Loyalty Transactions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty/transactions");
  });

  test("should display loyalty transactions page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /транзакции|transactions|баллы|points/i,
      }),
    ).toBeVisible();
  });

  test("should show transactions table", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
