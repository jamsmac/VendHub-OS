import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Referrals Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/referrals", { waitUntil: "networkidle" });
  });

  test("should render referrals page", async ({ page }) => {
    await expectPageOrError(page, /referral|реферал|приглашен/i);
  });

  test("should show content or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
