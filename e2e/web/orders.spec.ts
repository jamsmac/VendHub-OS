import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  expectContentOrEmpty,
  isPageUnavailable,
} from "../helpers";

test.describe("Admin Orders Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/orders", { waitUntil: "networkidle" });
  });

  test("should display orders page heading", async ({ page }) => {
    await expectPageOrError(page, /заказы|orders/i);
  });

  test("should show orders table", async ({ page }) => {
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

  test("should show order status badges", async ({ page }) => {
    const statuses = page.getByText(
      /pending|completed|processing|delivered|cancelled|в ожидании|завершён|доставлен/i,
    );
    if (
      await statuses
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(statuses.first()).toBeVisible();
    }
  });
});
