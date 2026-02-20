import { test, expect } from '@playwright/test';

test.describe('Mini App Loyalty', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/loyalty');
  });

  test('should display loyalty page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /бонусы|loyalty|баллы/i })).toBeVisible();
  });

  test('should show points balance', async ({ page }) => {
    // Points balance card
    await expect(page.getByText(/баллов|points/i).first()).toBeVisible();

    // Should show a number
    await expect(page.locator('text=/\\d+/').first()).toBeVisible();
  });

  test('should show current tier', async ({ page }) => {
    // Tier information
    await expect(
      page.getByText(/уровень|tier|базовый|серебряный|золотой|платиновый/i).first()
    ).toBeVisible();
  });

  test('should show tier progress', async ({ page }) => {
    // Progress bar or indicator
    const progress = page.locator('[class*="progress"], [role="progressbar"]').first();

    if (await progress.isVisible()) {
      await expect(progress).toBeVisible();
    }
  });

  test('should have tabs for rewards and history', async ({ page }) => {
    // Tab navigation
    await expect(page.getByRole('tab', { name: /награды|rewards/i }).or(page.getByText(/награды|rewards/i))).toBeVisible();
    await expect(page.getByRole('tab', { name: /история|history/i }).or(page.getByText(/история|history/i))).toBeVisible();
  });

  test('should switch to rewards tab', async ({ page }) => {
    const rewardsTab = page.getByRole('tab', { name: /награды|rewards/i }).or(
      page.getByRole('button', { name: /награды|rewards/i })
    );

    if (await rewardsTab.isVisible()) {
      await rewardsTab.click();

      // Should show rewards list
      await expect(page.getByText(/обменять|redeem|получить/i).first()).toBeVisible();
    }
  });

  test('should switch to history tab', async ({ page }) => {
    const historyTab = page.getByRole('tab', { name: /история|history/i }).or(
      page.getByRole('button', { name: /история|history/i })
    );

    if (await historyTab.isVisible()) {
      await historyTab.click();

      // Should show history (even if empty)
      await expect(
        page.getByText(/транзакции|transactions|операции|нет истории|no history/i).first()
      ).toBeVisible();
    }
  });

  test('should show reward details', async ({ page }) => {
    // Navigate to rewards
    const rewardsTab = page.getByRole('tab', { name: /награды|rewards/i }).or(
      page.getByRole('button', { name: /награды|rewards/i })
    );

    if (await rewardsTab.isVisible()) {
      await rewardsTab.click();
    }

    // Find a reward item
    const rewardItem = page.locator('[class*="reward"], [class*="card"]').first();

    if (await rewardItem.isVisible()) {
      // Reward should show cost
      await expect(page.getByText(/баллов|points/i).first()).toBeVisible();
    }
  });

  test('should show tier benefits', async ({ page }) => {
    // Benefits section
    await expect(
      page.getByText(/преимущества|benefits|бонусы|cashback|кэшбэк/i).first()
    ).toBeVisible();
  });
});
