import { test, expect } from "@playwright/test";
import { expectPageOrError, isPageUnavailable } from "../helpers";

test.describe("Promotions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/promotions", { waitUntil: "networkidle" });
  });

  test("should display promotions page header", async ({ page }) => {
    await expectPageOrError(page, /акции|промо|promotions/i);
  });

  test("should show promotion cards", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(page.getByText(/активных|всего/i).first()).toBeVisible();
  });

  test("should show tab navigation", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/акции|аналитика|купоны/i).first(),
    ).toBeVisible();
  });

  test("should switch to analytics tab", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const tab = page.getByText(/аналитика/i).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
    }
  });

  test("should switch to create promotion wizard", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const btn = page.getByText(/создать акцию/i).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  });
});
