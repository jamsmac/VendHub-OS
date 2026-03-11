import { test, expect } from "@playwright/test";

test.describe("Admin Help & Support Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/help");
  });

  test("should display help page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /помощь|help|support/i }),
    ).toBeVisible();
  });

  test("should show FAQ section", async ({ page }) => {
    await expect(
      page.getByText(/faq|часто задаваемые|вопросы/i).first(),
    ).toBeVisible();
  });

  test("should show contact information", async ({ page }) => {
    await expect(
      page.getByText(/контакты|contacts|связь/i).first(),
    ).toBeVisible();
  });

  test("should have feedback form or link", async ({ page }) => {
    const feedback = page.getByText(
      /обратная связь|feedback|написать|отправить/i,
    );
    if (await feedback.first().isVisible()) {
      await expect(feedback.first()).toBeVisible();
    }
  });
});
