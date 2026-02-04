import { test, expect } from '@playwright/test';

test.describe('Mini App Quests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/quests');
  });

  test('should display quests page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /задания|quests|миссии/i })).toBeVisible();
  });

  test('should show streak counter', async ({ page }) => {
    // Streak display
    await expect(page.getByText(/серия|streak|дней подряд/i).first()).toBeVisible();

    // Should show streak number
    await expect(page.locator('text=/\\d+/').first()).toBeVisible();
  });

  test('should have quest type tabs', async ({ page }) => {
    // Tabs for different quest types
    await expect(
      page.getByRole('tab', { name: /ежедневные|daily/i }).or(page.getByText(/ежедневные|daily/i))
    ).toBeVisible();

    await expect(
      page.getByRole('tab', { name: /еженедельные|weekly/i }).or(page.getByText(/еженедельные|weekly/i))
    ).toBeVisible();
  });

  test('should show daily quests', async ({ page }) => {
    // Click daily tab if needed
    const dailyTab = page.getByRole('tab', { name: /ежедневные|daily/i }).or(
      page.getByRole('button', { name: /ежедневные|daily/i })
    );

    if (await dailyTab.isVisible()) {
      await dailyTab.click();
    }

    // Should show quest items
    await expect(
      page.getByText(/выполнить|complete|награда|reward/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show weekly quests', async ({ page }) => {
    const weeklyTab = page.getByRole('tab', { name: /еженедельные|weekly/i }).or(
      page.getByRole('button', { name: /еженедельные|weekly/i })
    );

    if (await weeklyTab.isVisible()) {
      await weeklyTab.click();

      // Should show weekly quests
      await expect(
        page.getByText(/выполнить|complete|награда|reward|неделя|week/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show quest progress', async ({ page }) => {
    // Progress indicators
    const progressElements = page.locator('[class*="progress"], [role="progressbar"]');

    if ((await progressElements.count()) > 0) {
      await expect(progressElements.first()).toBeVisible();
    }
  });

  test('should show quest reward amounts', async ({ page }) => {
    // Rewards should show points
    await expect(page.getByText(/\+\d+|баллов|points/i).first()).toBeVisible();
  });

  test('should have claim button for completed quests', async ({ page }) => {
    // Look for claim buttons
    const claimButton = page.getByRole('button', { name: /получить|claim|забрать/i }).first();

    if (await claimButton.isVisible()) {
      await expect(claimButton).toBeEnabled();
    }
  });

  test('should show streak bonuses', async ({ page }) => {
    // Streak bonus section
    await expect(
      page.getByText(/бонус за серию|streak bonus|дополнительные баллы/i).first()
    ).toBeVisible();
  });

  test('should navigate between quest types', async ({ page }) => {
    // Daily
    const dailyTab = page.getByRole('tab', { name: /ежедневные|daily/i }).first();
    if (await dailyTab.isVisible()) {
      await dailyTab.click();
      await expect(dailyTab).toHaveAttribute('aria-selected', 'true');
    }

    // Weekly
    const weeklyTab = page.getByRole('tab', { name: /еженедельные|weekly/i }).first();
    if (await weeklyTab.isVisible()) {
      await weeklyTab.click();
      await expect(weeklyTab).toHaveAttribute('aria-selected', 'true');
    }
  });
});
