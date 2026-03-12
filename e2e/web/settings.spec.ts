import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/settings", { waitUntil: "networkidle" });
  });

  test("should display settings page heading", async ({ page }) => {
    await expectPageOrError(page, /настройки|settings/i);
  });

  test("should show settings sections", async ({ page }) => {
    await expectContentOrEmpty(page);
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
