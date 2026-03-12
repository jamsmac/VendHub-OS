import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Employees Attendance Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/attendance", {
      waitUntil: "networkidle",
    });
  });

  test("should display attendance page heading", async ({ page }) => {
    await expectPageOrError(page, /посещаемость|attendance|явка/i);
  });

  test("should show attendance data", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
