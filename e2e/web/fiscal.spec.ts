import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Fiscal Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/fiscal", { waitUntil: "networkidle" });
  });

  test("should display fiscal page heading", async ({ page }) => {
    await expectPageOrError(
      page,
      /фискал|fiscal|кассы|cash registers|ofд|ofd/i,
    );
  });

  test("should show fiscal data", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    const table = page.locator("table, [role='table']");
    const hasCards = (await cards.count()) > 0;
    const hasTable = (await table.count()) > 0;
    expect(hasCards || hasTable).toBeTruthy();
  });
});
