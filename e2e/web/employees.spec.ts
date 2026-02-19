import { test, expect } from "@playwright/test";

test.describe("Admin Employees Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/employees");
  });

  test("should display employees list", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /сотрудники|employees/i }),
    ).toBeVisible();

    // Should have a table
    await expect(page.locator('table, [role="table"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show employee stats cards", async ({ page }) => {
    // Stats cards
    await expect(page.getByText(/всего|total/i).first()).toBeVisible();
    await expect(page.getByText(/активные|active/i).first()).toBeVisible();
  });

  test("should have search functionality", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/поиск|search/i);
    await expect(searchInput).toBeVisible();

    // Search by name
    await searchInput.fill("Иван");
    await page.waitForTimeout(500);
  });

  test("should filter by role", async ({ page }) => {
    // Find role filter
    const roleFilter = page
      .getByRole("combobox", { name: /роль|role/i })
      .or(page.getByRole("button", { name: /роль|role/i }));

    if (await roleFilter.isVisible()) {
      await roleFilter.click();

      // Should show role options (7 RBAC roles: owner, admin, manager, operator, warehouse, accountant, viewer)
      await expect(
        page
          .getByRole("option", {
            name: /оператор|operator|админ|admin|менеджер|manager/i,
          })
          .first(),
      ).toBeVisible();
    }
  });

  test("should filter by status", async ({ page }) => {
    const statusFilter = page
      .getByRole("combobox", { name: /статус|status/i })
      .or(page.getByRole("button", { name: /статус|status/i }));

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Should show status options
      await expect(
        page
          .getByRole("option", { name: /активный|active|неактивный|inactive/i })
          .first(),
      ).toBeVisible();
    }
  });

  test("should have add employee button", async ({ page }) => {
    const addButton = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    await expect(addButton).toBeVisible();
  });

  test("should open add employee dialog", async ({ page }) => {
    const addButton = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    await addButton.click();

    // Dialog should open
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Should have form fields
    await expect(
      page.getByLabel(/имя|first name/i).or(page.getByPlaceholder(/имя/i)),
    ).toBeVisible();
    await expect(
      page
        .getByLabel(/фамилия|last name/i)
        .or(page.getByPlaceholder(/фамилия/i)),
    ).toBeVisible();
    await expect(
      page.getByLabel(/email|почта/i).or(page.getByPlaceholder(/email/i)),
    ).toBeVisible();
    await expect(
      page.getByLabel(/телефон|phone/i).or(page.getByPlaceholder(/телефон/i)),
    ).toBeVisible();
  });

  test("should validate required fields in add form", async ({ page }) => {
    const addButton = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    await addButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Try to submit empty form
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /сохранить|save|создать|create/i });
    await submitButton.click();

    // Should show validation errors
    await expect(page.getByText(/обязательно|required/i).first()).toBeVisible();
  });

  test("should close add dialog on cancel", async ({ page }) => {
    const addButton = page.getByRole("button", {
      name: /добавить|add|создать|create/i,
    });
    await addButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click cancel or close button
    const cancelButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /отмена|cancel|закрыть|close/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    } else {
      // Try pressing Escape
      await page.keyboard.press("Escape");
    }

    // Dialog should close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
  });

  test("should display employee details", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector("table tbody tr", { timeout: 10000 });

    // Click on view/edit button or row
    const viewButton = page
      .locator("table tbody tr")
      .first()
      .getByRole("button", { name: /просмотр|view|редактировать|edit/i });

    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Should show employee details
      await expect(
        page.getByText(/информация|details|данные/i).first(),
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
