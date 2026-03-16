import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Quests Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/quests", { waitUntil: "networkidle" });
  });

  test("should render quests page", async ({ page }) => {
    await expectPageOrError(page, /quests|задани|квест/i);
  });

  test("should show content or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
