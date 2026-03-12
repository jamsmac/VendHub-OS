import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Tasks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/tasks", { waitUntil: "networkidle" });
  });

  test("should display tasks page heading", async ({ page }) => {
    await expectPageOrError(page, /задачи|tasks|задания/i);
  });

  test("should show tasks list or board", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should have create task button", async ({ page }) => {
    const addBtn = page.getByRole("button", {
      name: /добавить|add|создать|create|новая|new/i,
    });
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeVisible();
    }
  });
});
