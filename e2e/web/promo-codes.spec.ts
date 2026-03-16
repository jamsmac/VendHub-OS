import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Promo Codes Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/promo-codes", { waitUntil: "networkidle" });
  });

  test("should render promo codes page", async ({ page }) => {
    await expectPageOrError(page, /promo|промокод/i);
  });

  test("should show content or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
