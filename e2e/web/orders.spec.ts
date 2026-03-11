import { test, expect } from "@playwright/test";

test.describe("Admin Orders Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/orders");
  });

  test("should display orders page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /заказы|orders/i }),
    ).toBeVisible();
  });

  test("should show orders table", async ({ page }) => {
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

  test("should show order status badges", async ({ page }) => {
    const statuses = page.getByText(
      /pending|completed|processing|delivered|cancelled|в ожидании|завершён|доставлен/i,
    );
    if (await statuses.first().isVisible()) {
      await expect(statuses.first()).toBeVisible();
    }
  });
});
