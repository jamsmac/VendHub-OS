import { test, expect } from "@playwright/test";

test.describe("Admin Work Logs Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/work-logs");
  });

  test("should display work logs page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /журнал работ|work logs|рабочие записи/i,
      }),
    ).toBeVisible();
  });

  test("should show work logs table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
