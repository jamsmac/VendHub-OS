import { test, expect } from "@playwright/test";
import { expectPageOrError, expectContentOrEmpty } from "../helpers";

test.describe("Payout Requests Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/payout-requests", {
      waitUntil: "networkidle",
    });
  });

  test("should display payout requests heading", async ({ page }) => {
    await expectPageOrError(page, /запросы на выплату|payout requests/i);
  });

  test("should show table or empty state", async ({ page }) => {
    await expectContentOrEmpty(page);
  });

  test("should render status filter buttons", async ({ page }) => {
    const allBtn = page.getByRole("button", { name: /все|all/i });
    const pendingBtn = page.getByRole("button", { name: /ожидают|pending/i });
    const hasAll = await allBtn
      .first()
      .isVisible()
      .catch(() => false);
    const hasPending = await pendingBtn
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasAll || hasPending).toBeTruthy();
  });

  test("should have create button", async ({ page }) => {
    const createBtn = page.getByRole("button", {
      name: /новый запрос|new request|создать/i,
    });
    const hasCreate = await createBtn
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasCreate).toBeTruthy();
  });
});
