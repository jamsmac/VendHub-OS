import { test, expect } from "@playwright/test";

test.describe("Admin Notifications Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/notifications");
  });

  test("should display notifications page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /уведомления|notifications/i }),
    ).toBeVisible();
  });

  test("should show notifications list or empty state", async ({ page }) => {
    const list = page.locator("[class*='card'], li, tr");
    const empty = page.getByText(/нет уведомлений|no notifications|пусто/i);
    const hasList = (await list.count()) > 0;
    const hasEmpty = await empty
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasList || hasEmpty).toBeTruthy();
  });
});
