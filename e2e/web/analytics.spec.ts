import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Analytics Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/analytics", { waitUntil: "networkidle" });
  });

  test("should render analytics page", async ({ page }) => {
    await expectPageOrError(page, /analytics|аналитик|revenue|выручка/i);
  });

  test("should show content or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
