import { test, expect } from "@playwright/test";

test.describe("Admin Vehicles Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/vehicles");
  });

  test("should display vehicles page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /транспорт|vehicles|автомобили|cars/i,
      }),
    ).toBeVisible();
  });

  test("should show vehicles table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
