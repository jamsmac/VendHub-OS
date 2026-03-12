import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Loyalty Achievements Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty/achievements", {
      waitUntil: "networkidle",
    });
  });

  test("should display achievements page heading", async ({ page }) => {
    await expectPageOrError(page, /достижения|achievements/i);
  });

  test("should show achievements list or cards", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
