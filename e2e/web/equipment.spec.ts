import { test, expect } from "@playwright/test";

test.describe("Admin Equipment Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/equipment");
  });

  test("should display equipment page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /оборудование|equipment|инструменты|tools/i,
      }),
    ).toBeVisible();
  });

  test("should show equipment table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
