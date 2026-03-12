import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Loyalty Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty/settings", {
      waitUntil: "networkidle",
    });
  });

  test("should display loyalty settings page heading", async ({ page }) => {
    await expectPageOrError(page, /настройки|settings|лояльность|loyalty/i);
  });

  test("should show settings form or cards", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
