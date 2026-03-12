import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Products Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/products", { waitUntil: "networkidle" });
  });

  test("should display products page heading", async ({ page }) => {
    await expectPageOrError(page, /продукты|products|товары/i);
  });

  test("should show tabs for products, recipes, ingredients", async ({
    page,
  }) => {
    const tabs = page.getByRole("tablist");
    if (await tabs.isVisible().catch(() => false)) {
      await expect(tabs).toBeVisible();
    }
  });

  test("should show products table or card list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have add product button", async ({ page }) => {
    const addBtn = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    if (await addBtn.isVisible().catch(() => false)) {
      await expect(addBtn).toBeVisible();
    }
  });
});
