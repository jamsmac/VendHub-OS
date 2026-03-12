import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Loyalty Promo Codes Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty/promo-codes", {
      waitUntil: "networkidle",
    });
  });

  test("should display promo codes page heading", async ({ page }) => {
    await expectPageOrError(page, /промо|promo|купоны|coupons/i);
  });

  test("should show promo codes table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
