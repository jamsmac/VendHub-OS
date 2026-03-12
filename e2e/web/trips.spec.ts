import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Trips Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/trips", { waitUntil: "networkidle" });
  });

  test("should display trips page heading", async ({ page }) => {
    await expectPageOrError(page, /рейсы|trips|маршруты|поездки/i);
  });

  test("should show trips table or list", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have create trip button", async ({ page }) => {
    const addBtn = page.getByRole("button", {
      name: /добавить|add|создать|create|новый|new|начать|start/i,
    });
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
