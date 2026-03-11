import { test, expect } from "@playwright/test";

test.describe("Admin Employees Departments Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/departments");
  });

  test("should display departments page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /отделы|departments|подразделения/i,
      }),
    ).toBeVisible();
  });

  test("should show departments list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
