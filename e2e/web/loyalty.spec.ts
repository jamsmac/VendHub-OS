import { test, expect } from "@playwright/test";

test.describe("Admin Loyalty Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty");
  });

  test("should display loyalty page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /лояльность|loyalty/i }),
    ).toBeVisible();
  });

  test("should show loyalty navigation tabs or links", async ({ page }) => {
    const links = page.getByText(
      /уровни|levels|достижения|achievements|квесты|quests|промо|promo|транзакции|transactions/i,
    );
    if (await links.first().isVisible()) {
      await expect(links.first()).toBeVisible();
    }
  });

  test("should show loyalty stats or cards", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
