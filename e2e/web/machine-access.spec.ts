import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Machine Access Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/machine-access", { waitUntil: "networkidle" });
  });

  test("should display machine access page heading", async ({ page }) => {
    await expectPageOrError(page, /доступ|access|машины|machines|ключи|keys/i);
  });

  test("should show access table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
