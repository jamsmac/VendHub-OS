import { test, expect } from "@playwright/test";

test.describe("Admin Directories Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/directories");
  });

  test("should display directories page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /справочники|directories|каталог|catalog/i,
      }),
    ).toBeVisible();
  });

  test("should show directory cards or list", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
