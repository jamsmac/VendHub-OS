import { test, expect } from "@playwright/test";

test.describe("Client Achievements Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/achievements");
  });

  test("should display achievements page", async ({ page }) => {
    await expect(
      page.getByText(/достижения|achievements/i).first(),
    ).toBeVisible();
  });

  test("should show achievements list or grid", async ({ page }) => {
    const items = page.locator("[class*='card'], [class*='badge'], li");
    expect(await items.count()).toBeGreaterThan(0);
  });
});
