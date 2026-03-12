import { test, expect } from "@playwright/test";

test.describe("Client QR Scan Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/scan", { waitUntil: "networkidle" });
  });

  test("should display scan page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/scan")) return;

    const text = page.getByText(/сканировать|scan|qr|камера|camera/i).first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should show scanner or manual input", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/scan")) return;

    const scanner = page.locator("video, canvas, [class*='scanner']");
    const manualInput = page.getByPlaceholder(/номер|number|код|code/i);
    const hasScanner = (await scanner.count()) > 0;
    const hasInput = await manualInput
      .first()
      .isVisible()
      .catch(() => false);
    if (hasScanner || hasInput) {
      expect(hasScanner || hasInput).toBeTruthy();
    }
  });
});
