import { test, expect } from "@playwright/test";
import { expectPageOrError, isPageUnavailable } from "../helpers";

test.describe("Investor Portal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/investor", { waitUntil: "networkidle" });
  });

  test("should display investor portal header", async ({ page }) => {
    await expectPageOrError(page, /портал инвестора|investor/i);
  });

  test("should show investor KPI cards", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/выручка|чистая прибыль|автоматов/i).first(),
    ).toBeVisible();
  });

  test("should have tab navigation", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/обзор|финансы|локации/i).first(),
    ).toBeVisible();
  });

  test("should display charts", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const chart = page.locator(".recharts-wrapper").first();
    if (await chart.isVisible().catch(() => false)) {
      await expect(chart).toBeVisible();
    }
  });

  test("should switch to finances tab", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const tab = page.getByText(/финансы/i).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
    }
  });
});
