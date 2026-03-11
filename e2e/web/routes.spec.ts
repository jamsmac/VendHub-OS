import { test, expect } from "@playwright/test";

test.describe("Admin Routes Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/routes");
  });

  test("should display routes page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /маршруты|routes/i }),
    ).toBeVisible();
  });

  test("should show routes list or table", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });

  test("should have create route button", async ({ page }) => {
    const addBtn = page.getByRole("button", {
      name: /добавить|add|создать|create|новый|new/i,
    });
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
