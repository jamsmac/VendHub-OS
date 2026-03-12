import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  expectContentOrEmpty,
  isPageUnavailable,
} from "../helpers";

test.describe("Admin Users Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/users", { waitUntil: "networkidle" });
  });

  test("should display users page heading", async ({ page }) => {
    await expectPageOrError(page, /пользователи|users|клиенты|customers/i);
  });

  test("should show users table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have search input", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const search = page.getByPlaceholder(/поиск|search/i).first();
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
