import { test, expect } from "@playwright/test";

test.describe("Admin Contractors Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/contractors");
  });

  test("should display contractors page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /подрядчики|contractors|исполнители/i,
      }),
    ).toBeVisible();
  });

  test("should show contractors list or table", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
