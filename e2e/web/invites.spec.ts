import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Admin Invites Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/invites", { waitUntil: "networkidle" });
  });

  test("should display invites page heading", async ({ page }) => {
    await expectPageOrError(page, /приглашения|invites|invitations/i);
  });

  test("should show invites list or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
