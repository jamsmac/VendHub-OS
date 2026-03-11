import { test, expect } from "@playwright/test";

test.describe("Admin Material Requests Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/material-requests");
  });

  test("should display material requests page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /заявки|requests|материалы|materials/i,
      }),
    ).toBeVisible();
  });

  test("should show requests table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
