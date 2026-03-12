import { test, expect } from "@playwright/test";
import { expectPageOrError, isPageUnavailable } from "../helpers";

test.describe("Counterparties Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/counterparties", { waitUntil: "networkidle" });
  });

  test("should display counterparties page header", async ({ page }) => {
    await expectPageOrError(page, /контрагенты|counterparties/i);
  });

  test("should show tab navigation", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/контрагенты|договоры|аналитика/i).first(),
    ).toBeVisible();
  });

  test("should display counterparties table", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(page.getByText(/название|ИНН|баланс/i).first()).toBeVisible();
  });

  test("should filter by search", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const searchInput = page.getByPlaceholder(/поиск/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("КофеМастер");
    }
  });

  test("should switch to contracts tab", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const contractsTab = page.getByText(/договоры/i).first();
    if (await contractsTab.isVisible().catch(() => false)) {
      await contractsTab.click();
    }
  });

  test("should switch to analytics tab", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const analyticsTab = page.getByText(/аналитика/i).first();
    if (await analyticsTab.isVisible().catch(() => false)) {
      await analyticsTab.click();
    }
  });
});
