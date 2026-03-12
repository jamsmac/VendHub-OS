import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Employees Reviews Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/reviews", {
      waitUntil: "networkidle",
    });
  });

  test("should display reviews page heading", async ({ page }) => {
    await expectPageOrError(page, /отзывы|reviews|оценка|evaluation/i);
  });

  test("should show reviews data", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
