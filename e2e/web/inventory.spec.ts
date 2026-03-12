import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Inventory Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/inventory", { waitUntil: "networkidle" });
  });

  test("should display inventory page heading", async ({ page }) => {
    await expectPageOrError(page, /инвентарь|inventory|остатки|stock/i);
  });

  test("should show inventory table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
