import { test, expect } from "@playwright/test";

test.describe("Admin Loyalty Quests Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty/quests");
  });

  test("should display quests page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /квесты|quests|задания/i }),
    ).toBeVisible();
  });

  test("should show quests list or cards", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});
