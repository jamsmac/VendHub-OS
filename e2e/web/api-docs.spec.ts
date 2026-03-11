import { test, expect } from "@playwright/test";

test.describe("Admin API Docs Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/api-docs");
  });

  test("should display API docs page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /api|документация|documentation|docs/i,
      }),
    ).toBeVisible();
  });

  test("should show API documentation content", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    const code = page.locator("code, pre");
    const hasCards = (await cards.count()) > 0;
    const hasCode = (await code.count()) > 0;
    expect(hasCards || hasCode).toBeTruthy();
  });
});
