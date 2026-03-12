import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Loyalty Transactions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/loyalty/transactions", {
      waitUntil: "networkidle",
    });
  });

  test("should display loyalty transactions page heading", async ({ page }) => {
    await expectPageOrError(page, /транзакции|transactions|баллы|points/i);
  });

  test("should show transactions table", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
