import { test, expect } from "@playwright/test";

test.describe("Admin Inventory Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/inventory");
  });

  test("should display inventory page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /инвентарь|inventory|остатки|stock/i,
      }),
    ).toBeVisible();
  });

  test("should show inventory table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
