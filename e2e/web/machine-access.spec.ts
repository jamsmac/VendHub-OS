import { test, expect } from "@playwright/test";

test.describe("Admin Machine Access Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/machine-access");
  });

  test("should display machine access page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /доступ|access|машины|machines|ключи|keys/i,
      }),
    ).toBeVisible();
  });

  test("should show access table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
