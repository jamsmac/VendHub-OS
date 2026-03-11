import { test, expect } from "@playwright/test";

test.describe("Admin Employees Attendance Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/attendance");
  });

  test("should display attendance page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /посещаемость|attendance|явка/i,
      }),
    ).toBeVisible();
  });

  test("should show attendance data", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
