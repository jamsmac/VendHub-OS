import { test, expect } from "@playwright/test";

test.describe("Client QR Scan Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/scan");
  });

  test("should display scan page", async ({ page }) => {
    await expect(
      page.getByText(/сканировать|scan|qr|камера|camera/i).first(),
    ).toBeVisible();
  });

  test("should show scanner or manual input", async ({ page }) => {
    const scanner = page.locator("video, canvas, [class*='scanner']");
    const manualInput = page.getByPlaceholder(/номер|number|код|code/i);
    const hasScanner = (await scanner.count()) > 0;
    const hasInput = await manualInput.isVisible().catch(() => false);
    expect(hasScanner || hasInput).toBeTruthy();
  });
});
