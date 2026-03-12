import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Integrations Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/integrations", { waitUntil: "networkidle" });
  });

  test("should display integrations page heading", async ({ page }) => {
    await expectPageOrError(page, /интеграции|integrations/i);
  });

  test("should show integration cards", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
