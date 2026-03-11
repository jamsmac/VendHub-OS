import { test, expect } from "@playwright/test";

test.describe("Admin Loyalty Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty/settings");
  });

  test("should display loyalty settings page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /настройки|settings|лояльность|loyalty/i,
      }),
    ).toBeVisible();
  });

  test("should show settings form or cards", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
