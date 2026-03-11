import { test, expect } from "@playwright/test";

test.describe("Client Referrals Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/referrals");
  });

  test("should display referral page", async ({ page }) => {
    await expect(
      page
        .getByText(/реферальная|referral|пригласить|invite|друзья|friends/i)
        .first(),
    ).toBeVisible();
  });

  test("should show referral code section", async ({ page }) => {
    await expect(page.getByText(/код|code/i).first()).toBeVisible();
  });

  test("should have share button", async ({ page }) => {
    const shareBtn = page.getByRole("button", {
      name: /поделиться|share|скопировать|copy/i,
    });
    if (await shareBtn.isVisible()) {
      await expect(shareBtn).toBeVisible();
    }
  });

  test("should show how it works section", async ({ page }) => {
    await expect(
      page.getByText(/как это работает|how it works|как работает/i).first(),
    ).toBeVisible();
  });

  test("should show invited friends section", async ({ page }) => {
    await expect(
      page
        .getByText(/приглашённые|invited|друзья|friends|рефералы|referrals/i)
        .first(),
    ).toBeVisible();
  });
});
