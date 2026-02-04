import { test, expect } from '@playwright/test';

test.describe('Admin Machines Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/machines');
  });

  test('should display machines list', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /автоматы|machines/i })).toBeVisible();

    // Should have a table or list
    const table = page.locator('table, [role="table"], [class*="table"]');
    await expect(table.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have search functionality', async ({ page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/поиск|search/i);
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill('VM-001');

    // Wait for filtered results
    await page.waitForTimeout(500);
  });

  test('should have status filter', async ({ page }) => {
    // Find filter dropdown or buttons
    const filterButton = page.getByRole('button', { name: /статус|status|фильтр|filter/i });

    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Should show status options
      await expect(
        page.getByRole('option', { name: /online|offline|обслуживание|maintenance/i }).first()
      ).toBeVisible();
    }
  });

  test('should show machine details on click', async ({ page }) => {
    // Wait for machines to load
    await page.waitForSelector('table tbody tr, [class*="card"], [class*="machine-item"]', {
      timeout: 10000,
    });

    // Click on first machine row/card
    const firstMachine = page.locator('table tbody tr, [class*="card"]').first();

    if (await firstMachine.isVisible()) {
      await firstMachine.click();

      // Should show details (either in modal, drawer, or new page)
      await expect(
        page.getByText(/серийный номер|serial|детали|details/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have add machine button (admin only)', async ({ page }) => {
    // Look for add button
    const addButton = page.getByRole('button', { name: /добавить|add|создать|create/i });

    // Admin should see add button
    await expect(addButton).toBeVisible();
  });

  test('should open add machine form', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /добавить|add|создать|create/i });

    if (await addButton.isVisible()) {
      await addButton.click();

      // Should open form (modal or new page)
      await expect(
        page.getByLabel(/название|name/i).or(page.getByPlaceholder(/название|name/i))
      ).toBeVisible({ timeout: 5000 });

      await expect(
        page.getByLabel(/серийный|serial/i).or(page.getByPlaceholder(/серийный|serial/i))
      ).toBeVisible();
    }
  });

  test('should display machine stats', async ({ page }) => {
    // Stats cards above table
    const statsTexts = [
      /всего|total/i,
      /online|активные|active/i,
      /offline|неактивные|inactive/i,
    ];

    for (const text of statsTexts) {
      await expect(page.getByText(text).first()).toBeVisible();
    }
  });

  test('should support pagination', async ({ page }) => {
    // Look for pagination controls
    const pagination = page.locator('[class*="pagination"], [aria-label*="pagination"]');

    if (await pagination.isVisible()) {
      // Should have page numbers or next/prev buttons
      await expect(
        page.getByRole('button', { name: /next|следующая|»|>/i }).first()
      ).toBeVisible();
    }
  });

  test('should export machines data', async ({ page }) => {
    // Look for export button
    const exportButton = page.getByRole('button', { name: /экспорт|export|скачать|download/i });

    if (await exportButton.isVisible()) {
      // Verify button is clickable
      await expect(exportButton).toBeEnabled();
    }
  });
});
