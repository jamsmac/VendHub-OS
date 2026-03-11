import { test, expect } from "@playwright/test";

test.describe("Admin Opening Balances Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/opening-balances");
  });

  test("should display opening balances page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /начальные остатки|opening balances|остатки/i,
      }),
    ).toBeVisible();
  });

  test("should show balances table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
