import { test, expect } from "@playwright/test";

test.describe("Admin Website Analytics Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/website");
  });

  test("should display website page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /сайт|website|аналитика|analytics/i,
      }),
    ).toBeVisible();
  });

  test("should show analytics cards or charts", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
