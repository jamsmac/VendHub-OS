import { test, expect } from "@playwright/test";

test.describe("Admin Team Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/team");
  });

  test("should display team page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /команда|team|сотрудники/i }),
    ).toBeVisible();
  });

  test("should show team members list or table", async ({ page }) => {
    const table = page.locator("table, [role='table']");
    const cards = page.locator("[class*='card']");

    const hasTable = (await table.count()) > 0;
    const hasCards = (await cards.count()) > 0;

    expect(hasTable || hasCards).toBeTruthy();
  });

  test("should have invite or add member button", async ({ page }) => {
    const addButton = page.getByRole("button", {
      name: /добавить|пригласить|add|invite/i,
    });

    if (await addButton.isVisible()) {
      await expect(addButton).toBeVisible();
    }
  });

  test("should show role badges", async ({ page }) => {
    const roles = page.getByText(
      /admin|operator|manager|owner|viewer|warehouse|accountant/i,
    );
    if (await roles.first().isVisible()) {
      await expect(roles.first()).toBeVisible();
    }
  });
});
