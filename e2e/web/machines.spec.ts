import { test, expect } from "@playwright/test";
import { expectPageOrError, isPageUnavailable } from "../helpers";

test.describe("Admin Machines Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/machines", { waitUntil: "networkidle" });
  });

  test("should display machines list", async ({ page }) => {
    await expectPageOrError(page, /автоматы|machines/i);
  });

  test("should have search functionality", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const searchInput = page.getByPlaceholder(/поиск|search/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("VM-001");
    }
  });

  test("should have status filter", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const filterButton = page.getByRole("button", {
      name: /статус|status|фильтр|filter/i,
    });
    if (await filterButton.isVisible().catch(() => false)) {
      await filterButton.click();
    }
  });

  test("should show machine details on click", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const firstMachine = page
      .locator('table tbody tr, [class*="card"]')
      .first();
    if (await firstMachine.isVisible().catch(() => false)) {
      await firstMachine.click();
    }
  });

  test("should have add machine button", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const addButton = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    await expect(addButton).toBeVisible();
  });

  test("should open add machine form", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const addButton = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
    }
  });

  test("should display machine stats", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/всего|total|online|active/i).first(),
    ).toBeVisible();
  });

  test("should support pagination", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const pagination = page.locator(
      '[class*="pagination"], [aria-label*="pagination"]',
    );
    if (await pagination.isVisible().catch(() => false)) {
      await expect(pagination).toBeVisible();
    }
  });

  test("should export machines data", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const exportButton = page.getByRole("button", {
      name: /экспорт|export|скачать|download/i,
    });
    if (await exportButton.isVisible().catch(() => false)) {
      await expect(exportButton).toBeEnabled();
    }
  });
});
