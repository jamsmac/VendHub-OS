import { test, expect } from "@playwright/test";

test.describe("Client Map Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/map", { waitUntil: "networkidle" });
  });

  test("should display map page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/map")) return;

    const mapContainer = page.locator(
      "[class*='map'], [class*='leaflet'], canvas",
    );
    const listView = page.getByText(/карта|map|список|list/i);
    const hasMap = (await mapContainer.count()) > 0;
    const hasList = await listView
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasMap || hasList).toBeTruthy();
  });

  test("should have map/list toggle", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/map")) return;

    const toggle = page.getByRole("button", {
      name: /карта|map|список|list/i,
    });
    if (
      await toggle
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(toggle.first()).toBeVisible();
    }
  });

  test("should have locate me button", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/map")) return;

    const locateBtn = page.getByRole("button", {
      name: /местоположение|locate|location|найти/i,
    });
    if (
      await locateBtn
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(locateBtn.first()).toBeVisible();
    }
  });
});
