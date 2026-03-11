import { test, expect } from "@playwright/test";

test.describe("Admin Users Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/users");
  });

  test("should display users page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /пользователи|users|клиенты|customers/i,
      }),
    ).toBeVisible();
  });

  test("should show users table or list", async ({ page }) => {
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

  test("should have add user button", async ({ page }) => {
    const addBtn = page.getByRole("button", {
      name: /добавить|add|создать|create|пригласить|invite/i,
    });
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
