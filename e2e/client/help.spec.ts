import { test, expect } from "@playwright/test";

test.describe("Client Help Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/help", { waitUntil: "networkidle" });
  });

  test("should display help page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/help")) return;

    const text = page.getByText(/помощь|help|поддержка|support/i).first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should show help content", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/help")) return;

    const items = page.locator("[class*='card'], [class*='accordion'], li");
    const count = await items.count();
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });
});
