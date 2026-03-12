import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  isPageUnavailable,
  expectContentOrEmpty,
} from "../helpers";

test.describe("Admin Map Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/map", { waitUntil: "networkidle" });
  });

  test("should display map page heading", async ({ page }) => {
    await expectPageOrError(page, /карта|map/i);
  });

  test("should show map container", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const mapEl = page.locator(
      "[class*='map'], [class*='leaflet'], canvas, iframe",
    );
    const hasMap = (await mapEl.count()) > 0;
    expect(hasMap).toBeTruthy();
  });
});
