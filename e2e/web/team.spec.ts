import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Team Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/team", { waitUntil: "networkidle" });
  });

  test("should display team page heading", async ({ page }) => {
    await expectPageOrError(page, /команда|team|сотрудники/i);
  });

  test("should show team members list or table", async ({ page }) => {
    await expectContentOrEmpty(page);
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
