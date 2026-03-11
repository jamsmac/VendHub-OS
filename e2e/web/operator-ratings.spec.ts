import { test, expect } from "@playwright/test";

test.describe("Admin Operator Ratings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/operator-ratings");
  });

  test("should display operator ratings page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /рейтинг|ratings|оценки|operators/i,
      }),
    ).toBeVisible();
  });

  test("should show ratings table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
