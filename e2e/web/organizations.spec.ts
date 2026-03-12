import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Organizations Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/organizations", { waitUntil: "networkidle" });
  });

  test("should display organizations page heading", async ({ page }) => {
    await expectPageOrError(
      page,
      /организации|organizations|компании|companies/i,
    );
  });

  test("should show organizations table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
