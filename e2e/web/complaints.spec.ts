import { test, expect } from "@playwright/test";

test.describe("Admin Complaints Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/complaints");
  });

  test("should display complaints page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /жалобы|complaints|обращения|tickets/i,
      }),
    ).toBeVisible();
  });

  test("should show complaints table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
