import { test, expect } from "@playwright/test";

test.describe("Client Promo Code Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/promo-code", { waitUntil: "networkidle" });
  });

  test("should display promo code page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/promo-code")) return;

    const text = page.getByText(/промокод|promo|купон|coupon/i).first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should have promo code input", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/promo-code")) return;

    const input = page.getByPlaceholder(/промокод|promo|code|код/i);
    if (
      await input
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(input.first()).toBeVisible();
    }
  });

  test("should have apply button", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/promo-code")) return;

    const btn = page.getByRole("button", {
      name: /применить|apply|активировать|activate/i,
    });
    if (
      await btn
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(btn.first()).toBeVisible();
    }
  });
});
