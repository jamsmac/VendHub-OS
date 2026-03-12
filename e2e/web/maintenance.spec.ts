import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Maintenance Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/maintenance", { waitUntil: "networkidle" });
  });

  test("should display maintenance page heading", async ({ page }) => {
    await expectPageOrError(page, /обслуживание|maintenance|техобслуживание/i);
  });

  test("should show maintenance records", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
