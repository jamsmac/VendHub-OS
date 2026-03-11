import { test, expect } from "@playwright/test";

test.describe("Admin Employees Payroll Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/payroll");
  });

  test("should display payroll page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /зарплата|payroll|начисления|salary/i,
      }),
    ).toBeVisible();
  });

  test("should show payroll data", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
