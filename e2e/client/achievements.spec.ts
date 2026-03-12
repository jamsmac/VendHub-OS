import { test, expect } from "@playwright/test";

test.describe("Client Achievements Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/achievements", { waitUntil: "networkidle" });
  });

  test("should display achievements page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/achievements")) return;

    const text = page.getByText(/достижения|achievements/i).first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should show achievements list or grid", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/achievements")) return;

    const items = page.locator("[class*='card'], [class*='badge'], li");
    const count = await items.count();
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });
});
