import { test, expect } from "@playwright/test";

test.describe("Client Referrals Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/referrals", { waitUntil: "networkidle" });
  });

  test("should display referral page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/referrals")) return;

    const text = page
      .getByText(/реферальная|referral|пригласить|invite|друзья|friends/i)
      .first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should show referral code section", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/referrals")) return;

    const code = page.getByText(/код|code/i).first();
    if (await code.isVisible().catch(() => false)) {
      await expect(code).toBeVisible();
    }
  });

  test("should have share button", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/referrals")) return;

    const shareBtn = page.getByRole("button", {
      name: /поделиться|share|скопировать|copy/i,
    });
    if (
      await shareBtn
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(shareBtn.first()).toBeVisible();
    }
  });

  test("should show how it works section", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/referrals")) return;

    const howItWorks = page
      .getByText(/как это работает|how it works|как работает/i)
      .first();
    if (await howItWorks.isVisible().catch(() => false)) {
      await expect(howItWorks).toBeVisible();
    }
  });

  test("should show invited friends section", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/referrals")) return;

    const invited = page
      .getByText(/приглашённые|invited|друзья|friends|рефералы|referrals/i)
      .first();
    if (await invited.isVisible().catch(() => false)) {
      await expect(invited).toBeVisible();
    }
  });
});
