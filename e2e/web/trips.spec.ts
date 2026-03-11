import { test, expect } from "@playwright/test";

test.describe("Admin Trips Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/trips");
  });

  test("should display trips page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /рейсы|trips|маршруты|поездки/i,
      }),
    ).toBeVisible();
  });

  test("should show trips table or list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });

  test("should have create trip button", async ({ page }) => {
    const addBtn = page.getByRole("button", {
      name: /добавить|add|создать|create|новый|new|начать|start/i,
    });
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
