import { test, expect } from "@playwright/test";

test.describe("Admin Alerts Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/alerts");
  });

  test("should display alerts page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /оповещения|alerts|уведомления|notifications/i,
      }),
    ).toBeVisible();
  });

  test("should show alerts list or empty state", async ({ page }) => {
    const items = page.locator("[class*='card'], table, li");
    const empty = page.getByText(/нет|no|пусто|empty/i);
    const hasItems = (await items.count()) > 0;
    const hasEmpty = await empty
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasItems || hasEmpty).toBeTruthy();
  });
});
