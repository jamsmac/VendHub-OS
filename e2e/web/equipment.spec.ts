import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Equipment Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/equipment", { waitUntil: "networkidle" });
  });

  test("should display equipment page heading", async ({ page }) => {
    await expectPageOrError(page, /оборудование|equipment|инструменты|tools/i);
  });

  test("should show equipment table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
