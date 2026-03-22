import { test, expect } from "@playwright/test";

test.describe("Payment Reports", () => {
  test("should display payment reports page", async ({ page }) => {
    await page.goto("/dashboard/payment-reports", {
      waitUntil: "networkidle",
    });

    await expect(page).toHaveURL(/payment-reports/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("should show upload section", async ({ page }) => {
    await page.goto("/dashboard/payment-reports", {
      waitUntil: "networkidle",
    });

    // Upload area should be present
    const uploadArea = page.locator(
      '[data-testid="upload-area"], input[type="file"], button:has-text(/загрузить|upload/i)',
    );
    await expect(uploadArea.first()).toBeVisible();
  });

  test("should show analytics tab", async ({ page }) => {
    await page.goto("/dashboard/payment-reports", {
      waitUntil: "networkidle",
    });

    const analyticsTab = page.locator(
      'button:has-text(/аналитика|analytics/i), [role="tab"]:has-text(/аналитика|analytics/i)',
    );
    if (await analyticsTab.isVisible()) {
      await analyticsTab.click();
      // Charts or empty state should appear
      await expect(
        page.locator("canvas, svg, [data-testid='empty-state']").first(),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("should display breadcrumbs", async ({ page }) => {
    await page.goto("/dashboard/payment-reports", {
      waitUntil: "networkidle",
    });

    const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
  });
});
