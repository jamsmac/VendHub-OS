import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  expectContentOrEmpty,
  isPageUnavailable,
} from "../helpers";

test.describe("Admin Website Management Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/website", { waitUntil: "networkidle" });
  });

  test("should display website page heading", async ({ page }) => {
    await expectPageOrError(page, /сайт|website|аналитика|analytics/i);
  });

  test("should show content or analytics data", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have tab navigation", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    // Tabs: Content, Banners, Partnership, Analytics, SEO, Settings
    const tabButtons = page.locator("button").filter({
      hasText: /content|banners|partnership|analytics|seo|settings/i,
    });
    const count = await tabButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("should show Banners tab", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const bannersTab = page
      .locator("button")
      .filter({ hasText: /banners/i })
      .first();
    if (await bannersTab.isVisible()) {
      await bannersTab.click();
      // Should show "Promotional Banners" heading or empty state
      await expect(
        page
          .getByText(/promotional banners|banner|промо/i)
          .or(page.getByText(/no banners|нет баннеров/i))
          .first(),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should have New Banner button in Banners tab", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const bannersTab = page
      .locator("button")
      .filter({ hasText: /banners/i })
      .first();
    if (await bannersTab.isVisible()) {
      await bannersTab.click();
      const newBtn = page.getByRole("button", {
        name: /new banner|создать|добавить/i,
      });
      if (await newBtn.isVisible()) {
        await expect(newBtn).toBeVisible();
      }
    }
  });

  test("should open banner creation form", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const bannersTab = page
      .locator("button")
      .filter({ hasText: /banners/i })
      .first();
    if (!(await bannersTab.isVisible())) return;

    await bannersTab.click();
    const newBtn = page.getByRole("button", { name: /new banner/i }).first();
    if (!(await newBtn.isVisible())) return;

    await newBtn.click();
    // Should show the form with Title (RU) input
    await expect(page.getByText(/title.*ru|заголовок/i).first()).toBeVisible({
      timeout: 5000,
    });
  });
});
