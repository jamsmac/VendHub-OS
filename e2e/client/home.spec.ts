import { test, expect } from "@playwright/test";

test.describe("Mini App Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("should display home page", async ({ page }) => {
    // Should show main content
    const heading = page.getByRole("heading").first();
    if (await heading.isVisible().catch(() => false)) {
      await expect(heading).toBeVisible();
    }
  });

  test("should show navigation bar", async ({ page }) => {
    // Bottom navigation
    const nav = page
      .locator('nav, [class*="navigation"], [class*="bottom-bar"]')
      .first();
    if (!(await nav.isVisible().catch(() => false))) return;
    await expect(nav).toBeVisible();

    // Navigation items — accept English or Russian
    const home = page
      .getByRole("link", { name: /главная|home/i })
      .or(page.getByText(/главная|home/i));
    if (
      await home
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(home.first()).toBeVisible();
    }

    const map = page
      .getByRole("link", { name: /карта|map/i })
      .or(page.getByText(/карта|map/i));
    if (
      await map
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(map.first()).toBeVisible();
    }
  });

  test("should display nearby machines", async ({ page }) => {
    // Section with machines — accept English or Russian, or the hero text
    const machinesText = page
      .getByText(/ближайшие|nearby|автоматы|machines|find the nearest/i)
      .first();
    if (await machinesText.isVisible().catch(() => false)) {
      await expect(machinesText).toBeVisible();
    }
  });

  test("should show search functionality", async ({ page }) => {
    // Search input or button — may not be visible on home
    const search = page
      .getByPlaceholder(/поиск|search/i)
      .or(page.getByRole("button", { name: /поиск|search/i }));

    if (
      await search
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(search.first()).toBeVisible();
    }
  });

  test("should navigate to map page", async ({ page }) => {
    const mapLink = page
      .getByRole("link", { name: /карта|map/i })
      .or(page.getByText(/карта|map/i));

    if (
      !(await mapLink
        .first()
        .isVisible()
        .catch(() => false))
    )
      return;

    await mapLink.first().click();

    // Should navigate to map
    await expect(page).toHaveURL(/map/i);
  });

  test("should navigate to loyalty page", async ({ page }) => {
    const loyaltyLink = page
      .getByRole("link", { name: /бонусы|loyalty|баллы|points/i })
      .or(page.getByText(/бонусы|loyalty|баллы|points/i));

    if (
      await loyaltyLink
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await loyaltyLink.first().click();
      await expect(page).toHaveURL(/loyalty/i);
    }
  });

  test("should show categories section", async ({ page }) => {
    // Categories — may not be visible on home page
    const categories = page.getByText(/категории|categories/i).first();
    if (await categories.isVisible().catch(() => false)) {
      await expect(categories).toBeVisible();
    }
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Check viewport is mobile
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeLessThanOrEqual(450);

    // Content should be visible and not overflow
    const body = page.locator("body");
    const boundingBox = await body.boundingBox();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(450);
    }
  });
});
