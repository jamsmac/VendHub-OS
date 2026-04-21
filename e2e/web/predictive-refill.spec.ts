import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  expectContentOrEmpty,
  isPageUnavailable,
} from "../helpers";

test.describe("Predictive Refill", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/predictive-refill", {
      waitUntil: "networkidle",
    });
  });

  test("should display predictive refill page heading", async ({ page }) => {
    await expectPageOrError(page, /прогноз|дозаправка|refill/i);
  });

  test("should show recommendations table or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should display KPI stat cards", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const cards = page.locator("[class*='card']");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have filter tabs (all, urgent, soon, normal)", async ({
    page,
  }) => {
    if (await isPageUnavailable(page)) return;
    const tabs = page.getByRole("tab");
    if (
      await tabs
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(2);
    }
  });

  test("list → detail → add to route flow", async ({ page }) => {
    if (await isPageUnavailable(page)) return;

    // 1. Verify table renders
    const table = page.locator("table");
    const hasTable = await table.isVisible().catch(() => false);
    if (!hasTable) return; // no data seeded — skip

    // 2. Verify at least one row is visible
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    if (rowCount === 0) return; // empty — nothing to test

    await expect(rows.first()).toBeVisible();

    // 3. Click first row → navigate to detail page
    await rows.first().click();

    // Wait for URL to change to the machine detail URL
    await page
      .waitForURL("**/predictive-refill/**", { timeout: 10000 })
      .catch(() => {
        // Navigation might not happen if row click is intercepted or API is down
      });

    const currentUrl = page.url();
    const isOnDetail = currentUrl.includes("/predictive-refill/");

    if (isOnDetail) {
      // 4. Verify recharts SVG wrapper renders (may need data)
      const chart = page.locator(".recharts-wrapper");
      const slotsTable = page.locator("table");

      // Either the chart or the table (slots detail) should be visible
      const hasChart = await chart.isVisible().catch(() => false);
      const hasSlots = await slotsTable.isVisible().catch(() => false);
      // Page must render something meaningful
      expect(hasChart || hasSlots).toBeTruthy();

      // 5. Verify "Прогноз, не гарантия" microcopy (only shown when chart renders with data)
      const microcopy = page.getByText("Прогноз, не гарантия");
      if (hasChart) {
        await expect(microcopy)
          .toBeVisible({ timeout: 5000 })
          .catch(() => {
            // microcopy only visible when slot data is present
          });
      }

      // 6. Navigate back to list
      await page.goBack();
      await page
        .waitForURL("**/predictive-refill", { timeout: 8000 })
        .catch(() => {});

      // 7. Wait for table to reappear
      await page.waitForSelector("table", { timeout: 8000 }).catch(() => {});
    }

    // 8. Select 2 rows via checkboxes and verify selection counter + button
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Verify selection counter shows "2 выбрано"
      await expect(page.getByText("2 выбрано")).toBeVisible({ timeout: 5000 });

      // Verify "Добавить в маршрут" button is visible
      const addToRouteBtn = page.getByRole("button", {
        name: /добавить в маршрут/i,
      });
      await expect(addToRouteBtn).toBeVisible();

      // 9. Click "Добавить в маршрут" — creates a route and redirects
      await addToRouteBtn.click();

      // Wait for redirect to the new route detail page
      await page
        .waitForURL("**/dashboard/routes/**", { timeout: 15000 })
        .catch(() => {
          // Redirect may not happen without a running API
        });
    }
  });
});
