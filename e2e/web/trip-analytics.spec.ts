import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Trip Analytics Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/trip-analytics", { waitUntil: "networkidle" });
  });

  test("should render trip analytics page", async ({ page }) => {
    await expectPageOrError(page, /trip|поездк|аналитик|analytics/i);
  });

  test("should show content or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
