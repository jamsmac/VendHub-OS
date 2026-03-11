import { test, expect } from "@playwright/test";

test.describe("Admin Locations Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/locations");
  });

  test("should display locations page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /локации|locations|точки|points|адреса|addresses/i,
      }),
    ).toBeVisible();
  });

  test("should show locations table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
