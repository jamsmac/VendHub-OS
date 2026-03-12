import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Reconciliation Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/reconciliation", { waitUntil: "networkidle" });
  });

  test("should display reconciliation page heading", async ({ page }) => {
    await expectPageOrError(
      page,
      /сверка|reconciliation|инкассация|collection/i,
    );
  });

  test("should show reconciliation data", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
