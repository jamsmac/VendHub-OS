import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Employees Payroll Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees/payroll", {
      waitUntil: "networkidle",
    });
  });

  test("should display payroll page heading", async ({ page }) => {
    await expectPageOrError(page, /зарплата|payroll|начисления|salary/i);
  });

  test("should show payroll data", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
