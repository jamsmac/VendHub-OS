import { test, expect } from "@playwright/test";

test.describe("Admin Import Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/import");
  });

  test("should display import page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /импорт|import|загрузка|upload/i }),
    ).toBeVisible();
  });

  test("should show import options or upload area", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    const upload = page.locator("input[type='file'], [class*='dropzone']");
    const hasCards = (await cards.count()) > 0;
    const hasUpload = (await upload.count()) > 0;
    expect(hasCards || hasUpload).toBeTruthy();
  });
});
