import { test, expect } from "@playwright/test";

test.describe("Admin Invites Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/invites");
  });

  test("should display invites page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /приглашения|invites|invitations/i,
      }),
    ).toBeVisible();
  });

  test("should show invites list or empty state", async ({ page }) => {
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
