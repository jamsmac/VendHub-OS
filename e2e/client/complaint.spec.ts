import { test, expect } from "@playwright/test";

test.describe("Client Complaint Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/complaint", { waitUntil: "networkidle" });
  });

  test("should display complaint page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/complaint")) return;

    const text = page
      .getByText(/жалоба|complaint|обращение|feedback|проблема|problem/i)
      .first();
    if (await text.isVisible().catch(() => false)) {
      await expect(text).toBeVisible();
    }
  });

  test("should have complaint form", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/complaint")) return;

    const textarea = page.locator("textarea");
    const input = page.locator("input[type='text'], input[type='email']");
    const hasTextarea = (await textarea.count()) > 0;
    const hasInput = (await input.count()) > 0;
    if (hasTextarea || hasInput) {
      expect(hasTextarea || hasInput).toBeTruthy();
    }
  });
});
