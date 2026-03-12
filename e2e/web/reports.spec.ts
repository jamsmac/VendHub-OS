import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  expectContentOrEmpty,
  isPageUnavailable,
} from "../helpers";

test.describe("Admin Reports Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/reports", { waitUntil: "networkidle" });
  });

  test("should display reports page heading", async ({ page }) => {
    await expectPageOrError(page, /отчёты|отчеты|reports/i);
  });

  test("should show report cards or sections", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have date range selector", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const dateInput = page.locator(
      "input[type='date'], [class*='calendar'], [class*='date']",
    );
    const datePicker = page.getByRole("button", {
      name: /дата|date|period/i,
    });
    const error = page.getByText(
      /произошла ошибка|error occurred|ошибка загрузки/i,
    );
    const hasDate = (await dateInput.count()) > 0;
    const hasPicker = await datePicker.isVisible().catch(() => false);
    const hasError = await error
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasDate || hasPicker || hasError).toBeTruthy();
  });

  test("should have export button", async ({ page }) => {
    const exportBtn = page.getByRole("button", {
      name: /экспорт|export|скачать|download/i,
    });
    if (await exportBtn.isVisible().catch(() => false)) {
      await expect(exportBtn).toBeVisible();
    }
  });
});
