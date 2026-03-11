import { test, expect } from "@playwright/test";

test.describe("Admin Audit Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/audit");
  });

  test("should display audit page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /аудит|audit|журнал|log/i }),
    ).toBeVisible();
  });

  test("should show audit log table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
