import { test, expect } from "@playwright/test";

test.describe("Admin Webhooks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/webhooks");
  });

  test("should display webhooks page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /вебхуки|webhooks/i }),
    ).toBeVisible();
  });

  test("should show webhooks list or empty state", async ({ page }) => {
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
