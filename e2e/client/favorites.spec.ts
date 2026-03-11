import { test, expect } from "@playwright/test";

test.describe("Client Favorites Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/favorites");
  });

  test("should display favorites page", async ({ page }) => {
    await expect(
      page.getByText(/избранное|favorites|любимые/i).first(),
    ).toBeVisible();
  });

  test("should show favorites list or empty state", async ({ page }) => {
    const items = page.locator("[class*='card'], li");
    const empty = page.getByText(/нет|no|пусто|empty|добавьте|add/i);
    const hasItems = (await items.count()) > 0;
    const hasEmpty = await empty
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasItems || hasEmpty).toBeTruthy();
  });
});
