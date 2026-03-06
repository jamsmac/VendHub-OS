import { test, expect } from "@playwright/test";

test.describe("Counterparties Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/counterparties");
  });

  test("should display counterparties page header", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /контрагенты/i }),
    ).toBeVisible();
  });

  test("should show tab navigation", async ({ page }) => {
    await expect(page.getByText(/контрагенты/i).first()).toBeVisible();
    await expect(page.getByText(/договоры/i).first()).toBeVisible();
    await expect(page.getByText(/аналитика/i).first()).toBeVisible();
  });

  test("should display counterparties table", async ({ page }) => {
    // Table headers
    await expect(page.getByText(/название/i).first()).toBeVisible();
    await expect(page.getByText(/ИНН/i).first()).toBeVisible();
    await expect(page.getByText(/баланс/i).first()).toBeVisible();
  });

  test("should filter by search", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/поиск.*инн/i);
    await searchInput.fill("КофеМастер");

    // Should filter results
    await expect(page.getByText(/КофеМастер/i).first()).toBeVisible();
  });

  test("should switch to contracts tab", async ({ page }) => {
    await page
      .getByText(/договоры/i)
      .first()
      .click();

    // Should show contracts table
    await expect(page.getByText(/№ договора/i).first()).toBeVisible();
  });

  test("should switch to analytics tab", async ({ page }) => {
    await page
      .getByText(/аналитика/i)
      .first()
      .click();

    // Should show KPI cards
    await expect(page.getByText(/всего контрагентов/i).first()).toBeVisible();
  });

  test("should open counterparty details slide-over", async ({ page }) => {
    // Click first counterparty row
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();

    // Slide-over should appear
    await expect(
      page.getByText(/информация о компании/i).first(),
    ).toBeVisible();
  });
});
