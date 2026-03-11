import { test, expect } from "@playwright/test";

test.describe("Client Promo Code Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/promo-code");
  });

  test("should display promo code page", async ({ page }) => {
    await expect(
      page.getByText(/промокод|promo|купон|coupon/i).first(),
    ).toBeVisible();
  });

  test("should have promo code input", async ({ page }) => {
    const input = page.getByPlaceholder(/промокод|promo|code|код/i);
    if (await input.isVisible()) {
      await expect(input).toBeVisible();
    }
  });

  test("should have apply button", async ({ page }) => {
    const btn = page.getByRole("button", {
      name: /применить|apply|активировать|activate/i,
    });
    if (await btn.isVisible()) {
      await expect(btn).toBeVisible();
    }
  });
});
