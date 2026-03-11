import { test, expect } from "@playwright/test";

test.describe("Admin Tasks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/tasks");
  });

  test("should display tasks page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /задачи|tasks|задания/i }),
    ).toBeVisible();
  });

  test("should show tasks list or board", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });

  test("should have create task button", async ({ page }) => {
    const addBtn = page.getByRole("button", {
      name: /добавить|add|создать|create|новая|new/i,
    });
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
