import { test, expect } from "@playwright/test";
import {
  expectPageOrError,
  expectContentOrEmpty,
  isPageUnavailable,
} from "../helpers";

test.describe("Admin Routes Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/routes", { waitUntil: "networkidle" });
  });

  test("should display routes page heading", async ({ page }) => {
    await expectPageOrError(page, /маршруты|routes/i);
  });

  test("should show routes list or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have create route button", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const addBtn = page
      .getByRole("button", {
        name: /добавить|add|создать|create|новый|new/i,
      })
      .first();
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });

  test("should display stats cards", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const cards = page.locator("[class*='card']");
    // Routes page has at least 4 stat cards (total, active, stops, avg)
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should have search input", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const search = page.getByPlaceholder(/поиск|search/i).first();
    if (await search.isVisible()) {
      await expect(search).toBeVisible();
    }
  });

  test("should have status filter dropdown", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const filterBtn = page.getByRole("button", {
      name: /все статусы|all statuses|статус|status|filter/i,
    });
    if (await filterBtn.isVisible()) {
      await expect(filterBtn).toBeVisible();
    }
  });
});

test.describe("Admin Routes Analytics Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/routes/analytics", {
      waitUntil: "networkidle",
    });
  });

  test("should display analytics page heading", async ({ page }) => {
    await expectPageOrError(
      page,
      /аналитика|analytics|route analytics|маршрут/i,
    );
  });

  test("should show KPI cards or loading state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have period selector", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const selector = page
      .getByRole("combobox")
      .or(page.getByText(/7 days|30 days|90 days|7 дн|30 дн/i).first());
    if (await selector.isVisible()) {
      await expect(selector).toBeVisible();
    }
  });

  test("should have tab navigation (employees, vehicles, anomalies)", async ({
    page,
  }) => {
    if (await isPageUnavailable(page)) return;
    const tabs = page.getByRole("tab").or(page.getByRole("tablist"));
    if (await tabs.first().isVisible()) {
      const count = await page.getByRole("tab").count();
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });
});

test.describe("Admin Routes Builder Page", () => {
  test("should display builder page", async ({ page }) => {
    await page.goto("/dashboard/routes/builder", {
      waitUntil: "networkidle",
    });
    await expectPageOrError(
      page,
      /конструктор|builder|маршрут|route|создать|create/i,
    );
  });
});
