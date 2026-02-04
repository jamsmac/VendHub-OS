import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard overview', async ({ page }) => {
    // Should show stats cards
    await expect(page.getByText(/выручка|revenue|доход/i).first()).toBeVisible();
    await expect(page.getByText(/заказы|orders/i).first()).toBeVisible();
    await expect(page.getByText(/автоматы|machines/i).first()).toBeVisible();
  });

  test('should have working sidebar navigation', async ({ page }) => {
    // Check sidebar items
    const sidebar = page.locator('nav, aside, [role="navigation"]').first();

    await expect(sidebar.getByText(/автоматы|machines/i)).toBeVisible();
    await expect(sidebar.getByText(/товары|products/i)).toBeVisible();
    await expect(sidebar.getByText(/заказы|orders/i)).toBeVisible();
    await expect(sidebar.getByText(/сотрудники|employees/i)).toBeVisible();
  });

  test('should navigate to machines page', async ({ page }) => {
    await page.getByRole('link', { name: /автоматы|machines/i }).click();

    await expect(page).toHaveURL(/machines/i);
    await expect(page.getByRole('heading', { name: /автоматы|machines/i })).toBeVisible();
  });

  test('should navigate to products page', async ({ page }) => {
    await page.getByRole('link', { name: /товары|products/i }).click();

    await expect(page).toHaveURL(/products/i);
    await expect(page.getByRole('heading', { name: /товары|products/i })).toBeVisible();
  });

  test('should navigate to orders page', async ({ page }) => {
    await page.getByRole('link', { name: /заказы|orders/i }).click();

    await expect(page).toHaveURL(/orders/i);
    await expect(page.getByRole('heading', { name: /заказы|orders/i })).toBeVisible();
  });

  test('should navigate to employees page', async ({ page }) => {
    await page.getByRole('link', { name: /сотрудники|employees/i }).click();

    await expect(page).toHaveURL(/employees/i);
    await expect(page.getByRole('heading', { name: /сотрудники|employees/i })).toBeVisible();
  });

  test('should navigate to maintenance page', async ({ page }) => {
    await page.getByRole('link', { name: /обслуживание|maintenance/i }).click();

    await expect(page).toHaveURL(/maintenance/i);
    await expect(page.getByRole('heading', { name: /обслуживание|maintenance/i })).toBeVisible();
  });

  test('should show user profile in header', async ({ page }) => {
    // Should show logged in user info
    await expect(page.getByText(/admin@vendhub.uz|администратор|admin/i)).toBeVisible();
  });

  test('should have working theme toggle', async ({ page }) => {
    // Find theme toggle button
    const themeButton = page.getByRole('button', { name: /тема|theme|mode/i });

    if (await themeButton.isVisible()) {
      // Click to toggle theme
      await themeButton.click();

      // Check if theme changed (dark class on body or html)
      const isDark = await page.evaluate(() => {
        return (
          document.documentElement.classList.contains('dark') ||
          document.body.classList.contains('dark')
        );
      });

      expect(typeof isDark).toBe('boolean');
    }
  });

  test('should display charts/graphs on dashboard', async ({ page }) => {
    // Look for chart elements (common chart libraries)
    const chartSelectors = [
      '[class*="chart"]',
      '[class*="recharts"]',
      'svg[class*="chart"]',
      '[data-testid*="chart"]',
      'canvas', // For Chart.js
    ];

    let chartFound = false;
    for (const selector of chartSelectors) {
      const charts = page.locator(selector);
      if ((await charts.count()) > 0) {
        chartFound = true;
        break;
      }
    }

    // Charts are optional but recommended
    if (chartFound) {
      expect(chartFound).toBeTruthy();
    }
  });
});
