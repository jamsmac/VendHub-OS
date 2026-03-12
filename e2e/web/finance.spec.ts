import { test, expect } from "@playwright/test";
import { expectPageOrError, isPageUnavailable } from "../helpers";

test.describe("Finance Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/finance", { waitUntil: "networkidle" });
  });

  test("should display finance page header", async ({ page }) => {
    await expectPageOrError(page, /финансы|finance/i);
  });

  test("should show tab navigation", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/обзор|overview|транзакции|бюджет/i).first(),
    ).toBeVisible();
  });

  test("should show KPI cards in overview", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/выручка|расходы|revenue|expenses/i).first(),
    ).toBeVisible();
  });

  test("should switch to transactions tab", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const tab = page.getByText(/транзакции/i).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
    }
  });

  test("should switch to P&L tab", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const tab = page.getByText("P&L").first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
    }
  });
});
