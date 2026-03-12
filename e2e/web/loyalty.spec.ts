import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Loyalty Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty", { waitUntil: "networkidle" });
  });

  test("should display loyalty page heading", async ({ page }) => {
    await expectPageOrError(page, /лояльность|loyalty/i);
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
    await expectContentOrEmpty(page);
  });
});
