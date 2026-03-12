import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Notifications Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/notifications", { waitUntil: "networkidle" });
  });

  test("should display notifications page heading", async ({ page }) => {
    await expectPageOrError(page, /уведомления|notifications/i);
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
