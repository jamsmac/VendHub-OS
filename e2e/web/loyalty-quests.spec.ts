import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Loyalty Quests Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty/quests", { waitUntil: "networkidle" });
  });

  test("should display quests page heading", async ({ page }) => {
    await expectPageOrError(page, /квесты|quests|задания/i);
  });

  test("should show quests list or cards", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
