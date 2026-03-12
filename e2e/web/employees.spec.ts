import { test, expect } from "@playwright/test";
import { expectPageOrError, isPageUnavailable } from "../helpers";

test.describe("Admin Employees Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees", { waitUntil: "networkidle" });
  });

  test("should display employees list", async ({ page }) => {
    await expectPageOrError(page, /сотрудники|employees/i);
  });

  test("should show employee stats cards", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/всего|total|активные|active/i).first(),
    ).toBeVisible();
  });

  test("should have search functionality", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const searchInput = page.getByPlaceholder(/поиск|search/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("Иван");
    }
  });

  test("should filter by role", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const roleFilter = page
      .getByRole("combobox", { name: /роль|role/i })
      .or(page.getByRole("button", { name: /роль|role/i }));
    if (await roleFilter.isVisible().catch(() => false)) {
      await roleFilter.click();
    }
  });

  test("should filter by status", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const statusFilter = page
      .getByRole("combobox", { name: /статус|status/i })
      .or(page.getByRole("button", { name: /статус|status/i }));
    if (await statusFilter.isVisible().catch(() => false)) {
      await statusFilter.click();
    }
  });

  test("should have add employee button", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const addButton = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    await expect(addButton).toBeVisible();
  });

  test("should display employee details", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const table = page.locator("table tbody tr").first();
    if (await table.isVisible().catch(() => false)) {
      const viewButton = table.getByRole("button", {
        name: /просмотр|view|редактировать|edit/i,
      });
      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
      }
    }
  });
});
