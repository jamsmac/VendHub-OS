import { test, expect } from "@playwright/test";

test.describe("Admin Employees Reviews Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/reviews");
  });

  test("should display reviews page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /отзывы|reviews|оценка|evaluation/i,
      }),
    ).toBeVisible();
  });

  test("should show reviews data", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
