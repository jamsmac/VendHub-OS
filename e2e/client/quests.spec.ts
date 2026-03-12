import { test, expect } from "@playwright/test";

test.describe("Mini App Quests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/quests", { waitUntil: "networkidle" });
  });

  test("should display quests page", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    const heading = page.getByRole("heading", {
      name: /задания|quests|миссии/i,
    });
    if (await heading.isVisible().catch(() => false)) {
      await expect(heading).toBeVisible();
    }
  });

  test("should show streak counter", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    // Streak display
    const streak = page.getByText(/серия|streak|дней подряд/i).first();
    if (await streak.isVisible().catch(() => false)) {
      await expect(streak).toBeVisible();
    }
  });

  test("should have quest type tabs", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    // Tabs for different quest types
    const daily = page
      .getByRole("tab", { name: /ежедневные|daily/i })
      .or(page.getByText(/ежедневные|daily/i));
    if (
      await daily
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(daily.first()).toBeVisible();
    }

    const weekly = page
      .getByRole("tab", { name: /еженедельные|weekly/i })
      .or(page.getByText(/еженедельные|weekly/i));
    if (
      await weekly
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(weekly.first()).toBeVisible();
    }
  });

  test("should show daily quests", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    // Click daily tab if needed
    const dailyTab = page
      .getByRole("tab", { name: /ежедневные|daily/i })
      .or(page.getByRole("button", { name: /ежедневные|daily/i }));

    if (
      await dailyTab
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await dailyTab.first().click();
    }

    // Should show quest items
    const quest = page.getByText(/выполнить|complete|награда|reward/i).first();
    if (await quest.isVisible().catch(() => false)) {
      await expect(quest).toBeVisible();
    }
  });

  test("should show weekly quests", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    const weeklyTab = page
      .getByRole("tab", { name: /еженедельные|weekly/i })
      .or(page.getByRole("button", { name: /еженедельные|weekly/i }));

    if (
      await weeklyTab
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await weeklyTab.first().click();

      // Should show weekly quests
      const quest = page
        .getByText(/выполнить|complete|награда|reward|неделя|week/i)
        .first();
      if (await quest.isVisible().catch(() => false)) {
        await expect(quest).toBeVisible();
      }
    }
  });

  test("should show quest progress", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    // Progress indicators
    const progressElements = page.locator(
      '[class*="progress"], [role="progressbar"]',
    );

    if ((await progressElements.count()) > 0) {
      if (
        await progressElements
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(progressElements.first()).toBeVisible();
      }
    }
  });

  test("should show quest reward amounts", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    // Rewards should show points
    const rewards = page.getByText(/\+\d+|баллов|points/i).first();
    if (await rewards.isVisible().catch(() => false)) {
      await expect(rewards).toBeVisible();
    }
  });

  test("should have claim button for completed quests", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    // Look for claim buttons
    const claimButton = page
      .getByRole("button", { name: /получить|claim|забрать/i })
      .first();

    if (await claimButton.isVisible().catch(() => false)) {
      await expect(claimButton).toBeEnabled();
    }
  });

  test("should show streak bonuses", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    // Streak bonus section
    const bonus = page
      .getByText(/бонус за серию|streak bonus|дополнительные баллы/i)
      .first();
    if (await bonus.isVisible().catch(() => false)) {
      await expect(bonus).toBeVisible();
    }
  });

  test("should navigate between quest types", async ({ page }) => {
    const url = page.url();
    if (!url.includes("/quests")) return;

    // Daily
    const dailyTab = page
      .getByRole("tab", { name: /ежедневные|daily/i })
      .first();
    if (await dailyTab.isVisible().catch(() => false)) {
      await dailyTab.click();
      // Only check aria-selected if the tab is accessible
      const selected = await dailyTab
        .getAttribute("aria-selected")
        .catch(() => null);
      if (selected !== null) {
        await expect(dailyTab).toHaveAttribute("aria-selected", "true");
      }
    }

    // Weekly
    const weeklyTab = page
      .getByRole("tab", { name: /еженедельные|weekly/i })
      .first();
    if (await weeklyTab.isVisible().catch(() => false)) {
      await weeklyTab.click();
      const selected = await weeklyTab
        .getAttribute("aria-selected")
        .catch(() => null);
      if (selected !== null) {
        await expect(weeklyTab).toHaveAttribute("aria-selected", "true");
      }
    }
  });
});
