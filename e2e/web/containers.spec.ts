import { test } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Containers Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/containers", { waitUntil: "networkidle" });
  });

  test("should render containers page", async ({ page }) => {
    await expectPageOrError(page, /containers|контейнер|hopper|бункер/i);
  });

  test("should show content or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });
});
