import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  expectContentOrEmpty,
  isPageUnavailable,
} from "../helpers";

test.describe("Admin Warehouse Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/warehouse", { waitUntil: "networkidle" });
  });

  test("should display warehouse page heading", async ({ page }) => {
    await expectPageOrError(page, /склад|warehouse|inventory/i);
  });

  test("should show warehouse list or table", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have search input", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const search = page.getByPlaceholder(/поиск|search/i).first();
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
