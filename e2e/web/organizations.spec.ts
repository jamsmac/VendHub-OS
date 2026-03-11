import { test, expect } from "@playwright/test";

test.describe("Admin Organizations Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/organizations");
  });

  test("should display organizations page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /организации|organizations|компании|companies/i,
      }),
    ).toBeVisible();
  });

  test("should show organizations table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
