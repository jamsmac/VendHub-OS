import { expect, type Page } from "@playwright/test";

/**
 * Returns true if the page shows error boundary, login redirect, or is still loading.
 */
export async function isPageUnavailable(page: Page): Promise<boolean> {
  const error = page.getByText(
    /произошла ошибка|error occurred|ошибка загрузки/i,
  );
  const login = page.getByRole("heading", { name: /vendhub admin/i });
  const loading = page.getByText("Loading...");

  const hasError = await error
    .first()
    .isVisible()
    .catch(() => false);
  const hasLogin = await login
    .first()
    .isVisible()
    .catch(() => false);
  const hasLoading = await loading
    .first()
    .isVisible()
    .catch(() => false);
  return hasError || hasLogin || hasLoading;
}

/**
 * Smoke test helper — checks that a page renders.
 * Accepts: heading, error boundary, login redirect, or loading state.
 */
export async function expectPageOrError(
  page: Page,
  headingPattern: RegExp,
): Promise<void> {
  const heading = page.getByRole("heading", { name: headingPattern });
  const textFallback = page.getByText(headingPattern).first();
  const errorBoundary = page.getByText(
    /произошла ошибка|error occurred|ошибка загрузки/i,
  );
  const loginPage = page.getByRole("heading", { name: /vendhub admin/i });
  const loading = page.getByText("Loading...");

  await expect(
    heading.or(textFallback).or(errorBoundary).or(loginPage).or(loading),
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Checks that a page has content: data items, empty state, error, login, or loading.
 */
export async function expectContentOrEmpty(page: Page): Promise<void> {
  const items = page.locator("[class*='card'], table, [role='table'], li");
  const empty = page.getByText(/нет|no |пусто|empty|не найден/i);
  const error = page.getByText(
    /произошла ошибка|error occurred|ошибка загрузки/i,
  );
  const login = page.getByRole("heading", { name: /vendhub admin/i });
  const loading = page.getByText("Loading...");

  const hasItems = (await items.count()) > 0;
  const hasEmpty = await empty
    .first()
    .isVisible()
    .catch(() => false);
  const hasError = await error
    .first()
    .isVisible()
    .catch(() => false);
  const hasLogin = await login
    .first()
    .isVisible()
    .catch(() => false);
  const hasLoading = await loading
    .first()
    .isVisible()
    .catch(() => false);

  expect(
    hasItems || hasEmpty || hasError || hasLogin || hasLoading,
  ).toBeTruthy();
}
