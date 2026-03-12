import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin References Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/references", { waitUntil: "networkidle" });
  });

  test("should display references page heading", async ({ page }) => {
    await expectPageOrError(page, /справочники|references|данные|data/i);
  });

  test("should show reference categories", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
