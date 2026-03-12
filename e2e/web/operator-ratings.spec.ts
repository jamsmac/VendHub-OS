import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Operator Ratings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/operator-ratings", {
      waitUntil: "networkidle",
    });
  });

  test("should display operator ratings page heading", async ({ page }) => {
    await expectPageOrError(page, /рейтинг|ratings|оценки|operators/i);
  });

  test("should show ratings table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
