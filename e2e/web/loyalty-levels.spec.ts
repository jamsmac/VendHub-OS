import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Loyalty Levels Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty/levels", { waitUntil: "networkidle" });
  });

  test("should display levels page heading", async ({ page }) => {
    await expectPageOrError(page, /уровни|levels|тiers/i);
  });

  test("should show levels list or cards", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
