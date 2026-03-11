import { test, expect } from "@playwright/test";

test.describe("Admin Map Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/map");
  });

  test("should display map page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /карта|map/i }),
    ).toBeVisible();
  });

  test("should show map container", async ({ page }) => {
    const mapEl = page.locator(
      "[class*='map'], [class*='leaflet'], canvas, iframe",
    );
    const hasMap = (await mapEl.count()) > 0;
    expect(hasMap).toBeTruthy();
  });
});
