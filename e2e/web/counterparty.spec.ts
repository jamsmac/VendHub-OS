import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Counterparty Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/counterparty", { waitUntil: "networkidle" });
  });

  test("should render counterparty page", async ({ page }) => {
    await expectPageOrError(page, /counterpart|контрагент|partner/i);
  });

  test("should show content or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
