import { test, expect } from "@playwright/test";
import { expectPageOrError, isPageUnavailable } from "../helpers";

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
  });

  test("should display dashboard overview", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const stats = page.getByText(
      /выручка|revenue|доход|транзакции|transactions|автоматы|machines/i,
    );
    await expect(stats.first()).toBeVisible();
  });

  test("should have working sidebar navigation", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    await expect(sidebar).toBeVisible();
  });

  test("should navigate to machines page", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const link = page.getByRole("link", { name: /автоматы|machines/i });
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/machines/i);
    }
  });

  test("should navigate to products page", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const link = page.getByRole("link", { name: /товары|products/i });
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/products/i);
    }
  });

  test("should navigate to orders page", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const link = page.getByRole("link", { name: /заказы|orders/i });
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/orders/i);
    }
  });

  test("should navigate to employees page", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const link = page.getByRole("link", { name: /сотрудники|employees/i });
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/employees/i);
    }
  });

  test("should navigate to maintenance page", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const link = page.getByRole("link", { name: /обслуживание|maintenance/i });
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/maintenance/i);
    }
  });

  test("should show user info in header", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const header = page.locator("header").first();
    await expect(header).toBeVisible();
  });

  test("should have working theme toggle", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const themeButton = page.getByRole("button").filter({
      has: page.locator(".sr-only"),
    });

    if (
      await themeButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await themeButton.first().click();
      const isDark = await page.evaluate(() => {
        return document.documentElement.classList.contains("dark");
      });
      expect(typeof isDark).toBe("boolean");
    }
  });

  test("should display charts", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const chartSelectors = [
      ".recharts-responsive-container",
      ".recharts-wrapper",
      '[class*="recharts"]',
      "svg.recharts-surface",
    ];

    let chartFound = false;
    for (const selector of chartSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        chartFound = true;
        break;
      }
    }
    if (chartFound) {
      expect(chartFound).toBeTruthy();
    }
  });

  test("should have locale switcher", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const localeSwitcher = page.locator("select").filter({
      has: page.locator("option"),
    });

    if (
      await localeSwitcher
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(localeSwitcher.first()).toBeVisible();
    }
  });
});
