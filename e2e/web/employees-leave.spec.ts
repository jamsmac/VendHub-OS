import { test, expect } from "@playwright/test";

test.describe("Admin Employees Leave Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/leave");
  });

  test("should display leave page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /отпуска|leave|отгулы|time off/i,
      }),
    ).toBeVisible();
  });

  test("should show leave records", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
