import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Webhooks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/webhooks", { waitUntil: "networkidle" });
  });

  test("should display webhooks page heading", async ({ page }) => {
    await expectPageOrError(page, /вебхуки|webhooks/i);
  });

  test("should show webhooks list or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
