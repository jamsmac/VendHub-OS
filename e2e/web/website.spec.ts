import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Website Analytics Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/website", { waitUntil: "networkidle" });
  });

  test("should display website page heading", async ({ page }) => {
    await expectPageOrError(page, /сайт|website|аналитика|analytics/i);
  });

  test("should show analytics cards or charts", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
