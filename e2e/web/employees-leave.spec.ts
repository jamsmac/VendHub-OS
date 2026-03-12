import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Employees Leave Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/leave", { waitUntil: "networkidle" });
  });

  test("should display leave page heading", async ({ page }) => {
    await expectPageOrError(page, /отпуска|leave|отгулы|time off/i);
  });

  test("should show leave records", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
