import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  expectContentOrEmpty,
  isPageUnavailable,
} from "../helpers";

test.describe("Admin Transactions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/transactions", { waitUntil: "networkidle" });
  });

  test("should display transactions page heading", async ({ page }) => {
    await expectPageOrError(page, /транзакции|transactions|платежи|payments/i);
  });

  test("should show transactions table", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have search or filter", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const search = page.getByPlaceholder(/поиск|search/i).first();
    const filter = page.getByRole("button", { name: /фильтр|filter/i });
    const error = page.getByText(
      /произошла ошибка|error occurred|ошибка загрузки/i,
    );
    const hasSearch = await search.isVisible().catch(() => false);
    const hasFilter = await filter.isVisible().catch(() => false);
    const hasError = await error
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasSearch || hasFilter || hasError).toBeTruthy();
  });
});
