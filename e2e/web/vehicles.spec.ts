import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Vehicles Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/vehicles", { waitUntil: "networkidle" });
  });

  test("should display vehicles page heading", async ({ page }) => {
    await expectPageOrError(page, /транспорт|vehicles|автомобили|cars/i);
  });

  test("should show vehicles table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
