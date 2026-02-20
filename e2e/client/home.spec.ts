import { test, expect } from '@playwright/test';

test.describe('Mini App Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display home page', async ({ page }) => {
    // Should show main content
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('should show navigation bar', async ({ page }) => {
    // Bottom navigation
    const nav = page.locator('nav, [class*="navigation"], [class*="bottom-bar"]').first();
    await expect(nav).toBeVisible();

    // Navigation items
    await expect(page.getByRole('link', { name: /главная|home/i }).or(page.getByText(/главная|home/i))).toBeVisible();
    await expect(page.getByRole('link', { name: /карта|map/i }).or(page.getByText(/карта|map/i))).toBeVisible();
  });

  test('should display nearby machines', async ({ page }) => {
    // Section with machines
    await expect(page.getByText(/ближайшие|nearby|автоматы|machines/i).first()).toBeVisible();
  });

  test('should show search functionality', async ({ page }) => {
    // Search input or button
    const search = page.getByPlaceholder(/поиск|search/i).or(
      page.getByRole('button', { name: /поиск|search/i })
    );

    await expect(search).toBeVisible();
  });

  test('should navigate to map page', async ({ page }) => {
    const mapLink = page.getByRole('link', { name: /карта|map/i }).or(
      page.getByText(/карта|map/i)
    );

    await mapLink.click();

    // Should navigate to map
    await expect(page).toHaveURL(/map/i);
  });

  test('should navigate to loyalty page', async ({ page }) => {
    const loyaltyLink = page.getByRole('link', { name: /бонусы|loyalty|баллы|points/i }).or(
      page.getByText(/бонусы|loyalty|баллы|points/i)
    );

    if (await loyaltyLink.isVisible()) {
      await loyaltyLink.click();
      await expect(page).toHaveURL(/loyalty/i);
    }
  });

  test('should show categories section', async ({ page }) => {
    // Categories
    await expect(page.getByText(/категории|categories/i).first()).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Check viewport is mobile
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeLessThanOrEqual(450);

    // Content should be visible and not overflow
    const body = page.locator('body');
    const boundingBox = await body.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(450);
  });
});
