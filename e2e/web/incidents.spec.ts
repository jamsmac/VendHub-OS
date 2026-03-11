import { test, expect } from "@playwright/test";

test.describe("Admin Incidents Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/incidents");
  });

  test("should display incidents page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /инциденты|incidents|происшествия/i,
      }),
    ).toBeVisible();
  });

  test("should show incidents list or table", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
