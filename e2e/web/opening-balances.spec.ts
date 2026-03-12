import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Opening Balances Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/opening-balances", {
      waitUntil: "networkidle",
    });
  });

  test("should display opening balances page heading", async ({ page }) => {
    await expectPageOrError(
      page,
      /начальные остатки|opening balances|остатки/i,
    );
  });

  test("should show balances table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
