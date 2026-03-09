import { useEffect, useRef } from "react";
import { authApi } from "../lib/api";
import { useUserStore } from "../lib/store";

/** Telegram WebApp global type declaration */
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    auth_date?: number;
    hash?: string;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
  themeParams: Record<string, string>;
  colorScheme: "light" | "dark";
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

/**
 * Auto-authenticates when running inside Telegram WebApp.
 * Sends initData to /auth/telegram and sets user in store.
 * No-op when running in a regular browser.
 */
export function useTelegramAuth() {
  const { setUser, isAuthenticated, setLoading } = useUserStore();
  const attempted = useRef(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData || isAuthenticated || attempted.current) return;

    attempted.current = true;

    // Signal Telegram that the app is ready
    tg.ready();
    tg.expand();

    setLoading(true);

    authApi
      .loginTelegram(tg.initData)
      .then((res) => {
        const data = res.data;
        setUser(data.user as unknown as Parameters<typeof setUser>[0]);
      })
      .catch((err) => {
        console.error(
          "[TG Auth] Failed:",
          err?.response?.data?.message || err.message,
        );
        setLoading(false);
      });
  }, [setUser, isAuthenticated, setLoading]);
}
