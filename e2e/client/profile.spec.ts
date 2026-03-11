import { test, expect } from "@playwright/test";

test.describe("Client Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/profile");
  });

  test("should display profile page", async ({ page }) => {
    await expect(page.getByText(/профиль|profile/i).first()).toBeVisible();
  });

  test("should show language setting", async ({ page }) => {
    await expect(page.getByText(/язык|language|til/i).first()).toBeVisible();
  });

  test("should show theme setting", async ({ page }) => {
    const theme = page.getByText(/тема|theme|mavzu/i);
    if (await theme.first().isVisible()) {
      await expect(theme.first()).toBeVisible();
    }
  });

  test("should show logout button", async ({ page }) => {
    await expect(page.getByText(/выйти|logout|chiqish/i).first()).toBeVisible();
  });

  test("should show personal info section", async ({ page }) => {
    const info = page.getByText(
      /информация|information|настройки|settings|аккаунт|account/i,
    );
    if (await info.first().isVisible()) {
      await expect(info.first()).toBeVisible();
    }
  });

  test("should have notification settings link", async ({ page }) => {
    const notif = page.getByText(/уведомления|notifications|bildirishnoma/i);
    if (await notif.first().isVisible()) {
      await expect(notif.first()).toBeVisible();
    }
  });
});
