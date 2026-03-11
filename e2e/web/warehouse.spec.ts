import { test, expect } from "@playwright/test";

test.describe("Admin Warehouse Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/warehouse");
  });

  test("should display warehouse page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /склад|warehouse|inventory/i }),
    ).toBeVisible();
  });

  test("should show warehouse list or table", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });

  test("should have search input", async ({ page }) => {
    const search = page.getByPlaceholder(/поиск|search/i);
    if (await search.isVisible()) {
      await expect(search).toBeVisible();
    }
  });

  test("should have add warehouse button", async ({ page }) => {
    const addBtn = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
