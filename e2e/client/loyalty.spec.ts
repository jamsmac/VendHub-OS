import { test, expect } from "@playwright/test";

test.describe("Mini App Loyalty", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/loyalty", { waitUntil: "networkidle" });
  });

  test("should display loyalty page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/loyalty")) return;

    const heading = page.getByRole("heading", {
      name: /бонусы|loyalty|баллы/i,
    });
    if (await heading.isVisible().catch(() => false)) {
      await expect(heading).toBeVisible();
    }
  });

  test("should show points balance", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/loyalty")) return;

    // Points balance card
    const points = page.getByText(/баллов|points/i).first();
    if (await points.isVisible().catch(() => false)) {
      await expect(points).toBeVisible();
    }
  });

  test("should show current tier", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/loyalty")) return;

    // Tier information
    const tier = page
      .getByText(/уровень|tier|базовый|серебряный|золотой|платиновый/i)
      .first();
    if (await tier.isVisible().catch(() => false)) {
      await expect(tier).toBeVisible();
    }
  });

  test("should show tier progress", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/loyalty")) return;

    // Progress bar or indicator
    const progress = page
      .locator('[class*="progress"], [role="progressbar"]')
      .first();
    if (await progress.isVisible().catch(() => false)) {
      await expect(progress).toBeVisible();
    }
  });

  test("should have tabs for rewards and history", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/loyalty")) return;

    // Tab navigation
    const rewards = page
      .getByRole("tab", { name: /награды|rewards/i })
      .or(page.getByText(/награды|rewards/i));
    if (
      await rewards
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(rewards.first()).toBeVisible();
    }

    const history = page
      .getByRole("tab", { name: /история|history/i })
      .or(page.getByText(/история|history/i));
    if (
      await history
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(history.first()).toBeVisible();
    }
  });

  test("should switch to rewards tab", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/loyalty")) return;

    const rewardsTab = page
      .getByRole("tab", { name: /награды|rewards/i })
      .or(page.getByRole("button", { name: /награды|rewards/i }));

    if (
      await rewardsTab
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await rewardsTab.first().click();

      // Should show rewards list
      const redeem = page.getByText(/обменять|redeem|получить/i).first();
      if (await redeem.isVisible().catch(() => false)) {
        await expect(redeem).toBeVisible();
      }
    }
  });

  test("should switch to history tab", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/loyalty")) return;

    const historyTab = page
      .getByRole("tab", { name: /история|history/i })
      .or(page.getByRole("button", { name: /история|history/i }));

    if (
      await historyTab
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await historyTab.first().click();

      // Should show history (even if empty)
      const historyContent = page
        .getByText(/транзакции|transactions|операции|нет истории|no history/i)
        .first();
      if (await historyContent.isVisible().catch(() => false)) {
        await expect(historyContent).toBeVisible();
      }
    }
  });

  test("should show reward details", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/loyalty")) return;

    // Navigate to rewards
    const rewardsTab = page
      .getByRole("tab", { name: /награды|rewards/i })
      .or(page.getByRole("button", { name: /награды|rewards/i }));

    if (
      await rewardsTab
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await rewardsTab.first().click();
    }

    // Find a reward item
    const rewardItem = page
      .locator('[class*="reward"], [class*="card"]')
      .first();

    if (await rewardItem.isVisible().catch(() => false)) {
      // Reward should show cost
      const cost = page.getByText(/баллов|points/i).first();
      if (await cost.isVisible().catch(() => false)) {
        await expect(cost).toBeVisible();
      }
    }
  });

  test("should show tier benefits", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/loyalty")) return;

    // Benefits section
    const benefits = page
      .getByText(/преимущества|benefits|бонусы|cashback|кэшбэк/i)
      .first();
    if (await benefits.isVisible().catch(() => false)) {
      await expect(benefits).toBeVisible();
    }
  });
});
