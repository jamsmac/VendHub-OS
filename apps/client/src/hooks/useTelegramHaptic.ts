/**
 * Telegram Mini App haptic feedback wrapper.
 *
 * No-op when running outside the Telegram WebApp (regular browser /
 * standalone PWA), so callers can use `haptic.success()` unconditionally
 * without polluting their handlers with environment checks.
 */

interface TelegramHapticFeedback {
  impactOccurred: (
    style: "light" | "medium" | "heavy" | "rigid" | "soft",
  ) => void;
  notificationOccurred: (type: "success" | "error" | "warning") => void;
  selectionChanged: () => void;
}

// useTelegramAuth.ts already augments `window.Telegram.WebApp`; the haptic
// API is a sibling on the same object. We cast via `unknown` rather than
// re-declaring the global to avoid "Subsequent property declarations must
// have the same type" conflicts (TS2717).
const getHaptic = (): TelegramHapticFeedback | undefined => {
  const webApp = window.Telegram?.WebApp as unknown as
    | { HapticFeedback?: TelegramHapticFeedback }
    | undefined;
  return webApp?.HapticFeedback;
};

export function useTelegramHaptic() {
  return {
    /** Tap-style impact — for button presses, selection commits. */
    impact: (style: "light" | "medium" | "heavy" = "medium") => {
      try {
        getHaptic()?.impactOccurred(style);
      } catch {
        /* no-op outside TMA */
      }
    },
    /** Outcome feedback — for mutation results. */
    success: () => {
      try {
        getHaptic()?.notificationOccurred("success");
      } catch {
        /* no-op */
      }
    },
    error: () => {
      try {
        getHaptic()?.notificationOccurred("error");
      } catch {
        /* no-op */
      }
    },
    warning: () => {
      try {
        getHaptic()?.notificationOccurred("warning");
      } catch {
        /* no-op */
      }
    },
    /** Subtle tick — for sliders / step changes. */
    select: () => {
      try {
        getHaptic()?.selectionChanged();
      } catch {
        /* no-op */
      }
    },
  };
}
