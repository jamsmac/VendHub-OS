import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Incidents Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/incidents", { waitUntil: "networkidle" });
  });

  test("should display incidents page heading", async ({ page }) => {
    await expectPageOrError(page, /инциденты|incidents|происшествия/i);
  });

  test("should show incidents list or table", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
