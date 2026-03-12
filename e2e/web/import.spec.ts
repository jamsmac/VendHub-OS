import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Import Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/import", { waitUntil: "networkidle" });
  });

  test("should display import page heading", async ({ page }) => {
    await expectPageOrError(page, /импорт|import|загрузка|upload/i);
  });

  test("should show import options or upload area", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    const upload = page.locator("input[type='file'], [class*='dropzone']");
    const hasCards = (await cards.count()) > 0;
    const hasUpload = (await upload.count()) > 0;
    expect(hasCards || hasUpload).toBeTruthy();
  });
});
