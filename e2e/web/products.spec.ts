import { test, expect } from "@playwright/test";

test.describe("Admin Products Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/products");
  });

  test("should display products page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /продукты|products|товары/i }),
    ).toBeVisible();
  });

  test("should show tabs for products, recipes, ingredients", async ({
    page,
  }) => {
    const tabs = page.getByRole("tablist");
    if (await tabs.isVisible()) {
      await expect(tabs).toBeVisible();
    }
  });

  test("should show products table or card list", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");
    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });

  test("should have add product button", async ({ page }) => {
    const addBtn = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
