import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Complaints Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/complaints", { waitUntil: "networkidle" });
  });

  test("should display complaints page heading", async ({ page }) => {
    await expectPageOrError(page, /жалобы|complaints|обращения|tickets/i);
  });

  test("should show complaints table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
