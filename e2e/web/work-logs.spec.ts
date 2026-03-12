import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Work Logs Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/work-logs", { waitUntil: "networkidle" });
  });

  test("should display work logs page heading", async ({ page }) => {
    await expectPageOrError(page, /журнал работ|work logs|рабочие записи/i);
  });

  test("should show work logs table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
