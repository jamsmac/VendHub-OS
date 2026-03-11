import { test, expect } from "@playwright/test";

test.describe("Admin References Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/references");
  });

  test("should display references page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /справочники|references|данные|data/i,
      }),
    ).toBeVisible();
  });

  test("should show reference categories", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
