import { test, expect } from "@playwright/test";

test.describe("Admin Maintenance Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/maintenance");
  });

  test("should display maintenance page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /обслуживание|maintenance|техобслуживание/i,
      }),
    ).toBeVisible();
  });

  test("should show maintenance records", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
