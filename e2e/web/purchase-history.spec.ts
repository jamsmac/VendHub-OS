import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Purchase History Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/purchase-history", {
      waitUntil: "networkidle",
    });
  });

  test("should display purchase history heading", async ({ page }) => {
    await expectPageOrError(page, /история покупок|purchase history/i);
  });

  test("should show table or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
