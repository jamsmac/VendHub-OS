import { create } from "zustand";

/**
 * App-level state (non-auth concerns).
 * User state lives exclusively in useAuthStore (apps/web/src/lib/store/auth.ts).
 */
interface AppState {
  // Future: locale, sidebar collapsed, theme, etc.
}

export const useAppStore = create<AppState>()(() => ({
  // Empty for now — user state has been consolidated into useAuthStore
}));
