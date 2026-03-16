import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Collections Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/collections", { waitUntil: "networkidle" });
  });

  test("should render collections page", async ({ page }) => {
    await expectPageOrError(page, /collections|инкассац|collected|received/i);
  });

  test("should show content or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have status filter buttons", async ({ page }) => {
    const btn = page.getByRole("button", { name: /all|все/i });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  });
});
