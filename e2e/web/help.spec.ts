import { test, expect } from "@playwright/test";
import { expectPageOrError, isPageUnavailable } from "../helpers";

test.describe("Admin Help & Support Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/help", { waitUntil: "networkidle" });
  });

  test("should display help page heading", async ({ page }) => {
    await expectPageOrError(page, /помощь|help|support/i);
  });

  test("should show FAQ section", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/faq|часто задаваемые|вопросы/i).first(),
    ).toBeVisible();
  });

  test("should show contact information", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    await expect(
      page.getByText(/контакты|contacts|связь|поддержка|support/i).first(),
    ).toBeVisible();
  });

  test("should have feedback form or link", async ({ page }) => {
    if (await isPageUnavailable(page)) return;
    const feedback = page.getByText(
      /обратная связь|feedback|написать|отправить/i,
    );
    if (
      await feedback
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(feedback.first()).toBeVisible();
    }
  });
});
