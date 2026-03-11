import { test, expect } from "@playwright/test";

test.describe("Client Help Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/help");
  });

  test("should display help page", async ({ page }) => {
    await expect(
      page.getByText(/помощь|help|поддержка|support/i).first(),
    ).toBeVisible();
  });

  test("should show help content", async ({ page }) => {
    const items = page.locator("[class*='card'], [class*='accordion'], li");
    expect(await items.count()).toBeGreaterThan(0);
  });
});
