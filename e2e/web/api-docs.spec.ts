import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin API Docs Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/api-docs", { waitUntil: "networkidle" });
  });

  test("should display API docs page heading", async ({ page }) => {
    await expectPageOrError(page, /api|документация|documentation|docs/i);
  });

  test("should show API documentation content", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    const code = page.locator("code, pre");
    const hasCards = (await cards.count()) > 0;
    const hasCode = (await code.count()) > 0;
    expect(hasCards || hasCode).toBeTruthy();
  });
});
