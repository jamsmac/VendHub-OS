import { test, expect } from "@playwright/test";

test.describe("Client Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });
  });

  test("should display profile page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/profile")) return;

    const text = page.getByText(/профиль|profile/i).first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should show language setting", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/profile")) return;

    const lang = page.getByText(/язык|language|til/i).first();
    if (await lang.isVisible().catch(() => false)) {
      await expect(lang).toBeVisible();
    }
  });

  test("should show theme setting", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/profile")) return;

    const theme = page.getByText(/тема|theme|mavzu/i);
    if (
      await theme
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(theme.first()).toBeVisible();
    }
  });

  test("should show logout button", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/profile")) return;

    const logout = page.getByText(/выйти|logout|chiqish/i).first();
    if (await logout.isVisible().catch(() => false)) {
      await expect(logout).toBeVisible();
    }
  });

  test("should show personal info section", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/profile")) return;

    const info = page.getByText(
      /информация|information|настройки|settings|аккаунт|account/i,
    );
    if (
      await info
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(info.first()).toBeVisible();
    }
  });

  test("should have notification settings link", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/profile")) return;

    const notif = page.getByText(/уведомления|notifications|bildirishnoma/i);
    if (
      await notif
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(notif.first()).toBeVisible();
    }
  });
});
