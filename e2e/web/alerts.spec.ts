import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Alerts Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/alerts", { waitUntil: "networkidle" });
  });

  test("should display alerts page heading", async ({ page }) => {
    await expectPageOrError(
      page,
      /оповещения|alerts|уведомления|notifications/i,
    );
  });

  test("should show alerts list or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
