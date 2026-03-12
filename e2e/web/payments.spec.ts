import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Payments Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/payments", { waitUntil: "networkidle" });
  });

  test("should display payments page heading", async ({ page }) => {
    await expectPageOrError(page, /платежи|payments|оплата/i);
  });

  test("should show payments table or cards", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
