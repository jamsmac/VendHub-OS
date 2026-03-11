import { test, expect } from "@playwright/test";

test.describe("Admin Transactions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/transactions");
  });

  test("should display transactions page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /транзакции|transactions|платежи|payments/i,
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

  test("should have search or filter", async ({ page }) => {
    const search = page.getByPlaceholder(/поиск|search/i);
    const filter = page.getByRole("button", { name: /фильтр|filter/i });
    const hasSearch = await search.isVisible();
    const hasFilter = await filter.isVisible();
    expect(hasSearch || hasFilter).toBeTruthy();
  });
});
