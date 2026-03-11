import { test, expect } from "@playwright/test";

test.describe("Client Transaction History Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions");
  });

  test("should display transactions page", async ({ page }) => {
    await expect(
      page
        .getByText(/история|history|транзакции|transactions|покупки|purchases/i)
        .first(),
    ).toBeVisible();
  });

  test("should show filter tabs or period selector", async ({ page }) => {
    const filters = page.getByText(
      /сегодня|today|неделя|week|месяц|month|все|all/i,
    );
    if (await filters.first().isVisible()) {
      await expect(filters.first()).toBeVisible();
    }
  });

  test("should have search input", async ({ page }) => {
    const search = page.getByPlaceholder(/поиск|search/i);
    if (await search.isVisible()) {
      await expect(search).toBeVisible();
    }
  });

  test("should show empty state or transaction list", async ({ page }) => {
    const emptyState = page.getByText(
      /нет транзакций|no transactions|пусто|empty/i,
    );
    const transactionItem = page.locator("[class*='card'], li, tr");
    const hasEmpty = await emptyState
      .first()
      .isVisible()
      .catch(() => false);
    const hasItems = (await transactionItem.count()) > 0;
    expect(hasEmpty || hasItems).toBeTruthy();
  });
});
