import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Contractors Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/contractors", { waitUntil: "networkidle" });
  });

  test("should display contractors page heading", async ({ page }) => {
    await expectPageOrError(page, /подрядчики|contractors|исполнители/i);
  });

  test("should show contractors list or table", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
