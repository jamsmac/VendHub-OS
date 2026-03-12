import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Employees Departments Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/departments", {
      waitUntil: "networkidle",
    });
  });

  test("should display departments page heading", async ({ page }) => {
    await expectPageOrError(page, /отделы|departments|подразделения/i);
  });

  test("should show departments list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
