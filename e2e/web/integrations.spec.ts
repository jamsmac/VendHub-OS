import { test, expect } from "@playwright/test";

test.describe("Admin Integrations Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/integrations");
  });

  test("should display integrations page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /интеграции|integrations/i }),
    ).toBeVisible();
  });

  test("should show integration cards", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
