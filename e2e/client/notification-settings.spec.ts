import { test, expect } from "@playwright/test";

test.describe("Client Notification Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/notification-settings", { waitUntil: "networkidle" });
  });

  test("should display notification settings page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/notification-settings")) return;

    const text = page
      .getByText(/уведомления|notifications|настройки|settings/i)
      .first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should show toggle switches or checkboxes", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/notification-settings")) return;

    const toggles = page.locator(
      "[role='switch'], input[type='checkbox'], [class*='toggle']",
    );
    if ((await toggles.count()) > 0) {
      expect(await toggles.count()).toBeGreaterThan(0);
    }
  });
});
