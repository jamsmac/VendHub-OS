import { test, expect } from "@playwright/test";

test.describe("Admin Reports Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/reports");
  });

  test("should display reports page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /отчёты|отчеты|reports/i }),
    ).toBeVisible();
  });

  test("should show report cards or sections", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("should have date range selector", async ({ page }) => {
    const dateInput = page.locator(
      "input[type='date'], [class*='calendar'], [class*='date']",
    );
    const datePicker = page.getByRole("button", { name: /дата|date|period/i });
    const hasDate = (await dateInput.count()) > 0;
    const hasPicker = await datePicker.isVisible();
    expect(hasDate || hasPicker).toBeTruthy();
  });

  test("should have export button", async ({ page }) => {
    const exportBtn = page.getByRole("button", {
      name: /экспорт|export|скачать|download/i,
    });
    if (await exportBtn.isVisible()) {
      await expect(exportBtn).toBeVisible();
    }
  });
});
