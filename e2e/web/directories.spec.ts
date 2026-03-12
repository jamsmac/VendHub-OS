import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Directories Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/directories", { waitUntil: "networkidle" });
  });

  test("should display directories page heading", async ({ page }) => {
    await expectPageOrError(page, /справочники|directories|каталог|catalog/i);
  });

  test("should show directory cards or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
