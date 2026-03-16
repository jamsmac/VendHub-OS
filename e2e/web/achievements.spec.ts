import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Achievements Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/achievements", { waitUntil: "networkidle" });
  });

  test("should render achievements page", async ({ page }) => {
    await expectPageOrError(page, /achievements|достижен/i);
  });

  test("should show content or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
