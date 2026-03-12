import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Audit Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/audit", { waitUntil: "networkidle" });
  });

  test("should display audit page heading", async ({ page }) => {
    await expectPageOrError(page, /аудит|audit|журнал|log/i);
  });

  test("should show audit log table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
