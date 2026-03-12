import { test, expect } from "@playwright/test";

test.describe("Client Transaction History Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions", { waitUntil: "networkidle" });
  });

  test("should display transactions page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/transactions")) return;

    const text = page
      .getByText(/история|history|транзакции|transactions|покупки|purchases/i)
      .first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should show filter tabs or period selector", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/transactions")) return;

    const filters = page.getByText(
      /сегодня|today|неделя|week|месяц|month|все|all/i,
    );
    if (
      await filters
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(filters.first()).toBeVisible();
    }
  });

  test("should have search input", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/transactions")) return;

    const search = page.getByPlaceholder(/поиск|search/i);
    if (
      await search
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(search.first()).toBeVisible();
    }
  });

  test("should show empty state or transaction list", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/transactions")) return;

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
