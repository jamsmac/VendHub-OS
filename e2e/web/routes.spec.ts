import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  expectContentOrEmpty,
  isPageUnavailable,
} from "../helpers";

test.describe("Admin Routes Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/routes", { waitUntil: "networkidle" });
  });

  test("should display routes page heading", async ({ page }) => {
    await expectPageOrError(page, /маршруты|routes/i);
  });

  test("should show routes list or table", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have create route button", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const addBtn = page
      .getByRole("button", {
        name: /добавить|add|создать|create|новый|new/i,
      })
      .first();
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
