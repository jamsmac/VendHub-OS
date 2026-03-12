import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Material Requests Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/material-requests", {
      waitUntil: "networkidle",
    });
  });

  test("should display material requests page heading", async ({ page }) => {
    await expectPageOrError(page, /заявки|requests|материалы|materials/i);
  });

  test("should show requests table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
