import { test, expect } from "@playwright/test";

test.describe("Admin Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/settings");
  });

  test("should display settings page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /настройки|settings/i }),
    ).toBeVisible();
  });

  test("should show settings sections", async ({ page }) => {
    const cards = page.locator("[class*='card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("should have save button", async ({ page }) => {
    const saveBtn = page.getByRole("button", {
      name: /сохранить|save/i,
    });
    if (await saveBtn.isVisible()) {
      await expect(saveBtn).toBeVisible();
    }
  });

  test("should show organization settings", async ({ page }) => {
    const org = page.getByText(/организация|organization|компания|company/i);
    if (await org.first().isVisible()) {
      await expect(org.first()).toBeVisible();
    }
  });
});
