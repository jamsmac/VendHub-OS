import { test, expect } from "@playwright/test";

test.describe("Admin Fiscal Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/fiscal");
  });

  test("should display fiscal page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /фискал|fiscal|кассы|cash registers|ofд|ofd/i,
      }),
    ).toBeVisible();
  });

  test("should show fiscal data", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    const table = page.locator("table, [role='table']");
    const hasCards = (await cards.count()) > 0;
    const hasTable = (await table.count()) > 0;
    expect(hasCards || hasTable).toBeTruthy();
  });
});
