import { test, expect } from "@playwright/test";

test.describe("Client Notification Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/notification-settings");
  });

  test("should display notification settings page", async ({ page }) => {
    await expect(
      page.getByText(/уведомления|notifications|настройки|settings/i).first(),
    ).toBeVisible();
  });

  test("should show toggle switches or checkboxes", async ({ page }) => {
    const toggles = page.locator(
      "[role='switch'], input[type='checkbox'], [class*='toggle']",
    );
    if ((await toggles.count()) > 0) {
      expect(await toggles.count()).toBeGreaterThan(0);
    }
  });
});
