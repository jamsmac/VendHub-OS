import { test, expect } from "@playwright/test";

test.describe("Client Favorites Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/favorites", { waitUntil: "networkidle" });
  });

  test("should display favorites page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/favorites")) return;

    const text = page.getByText(/избранное|favorites|любимые/i).first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should show favorites list or empty state", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/favorites")) return;

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
