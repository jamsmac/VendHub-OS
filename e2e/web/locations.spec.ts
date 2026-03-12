import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Locations Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/locations", { waitUntil: "networkidle" });
  });

  test("should display locations page heading", async ({ page }) => {
    await expectPageOrError(
      page,
      /локации|locations|точки|points|адреса|addresses/i,
    );
  });

  test("should show locations table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
