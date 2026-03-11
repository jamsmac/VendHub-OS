import { test, expect } from "@playwright/test";

test.describe("Client Complaint Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/complaint");
  });

  test("should display complaint page", async ({ page }) => {
    await expect(
      page
        .getByText(/жалоба|complaint|обращение|feedback|проблема|problem/i)
        .first(),
    ).toBeVisible();
  });

  test("should have complaint form", async ({ page }) => {
    const textarea = page.locator("textarea");
    const input = page.locator("input[type='text'], input[type='email']");
    const hasTextarea = (await textarea.count()) > 0;
    const hasInput = (await input.count()) > 0;
    expect(hasTextarea || hasInput).toBeTruthy();
  });
});
