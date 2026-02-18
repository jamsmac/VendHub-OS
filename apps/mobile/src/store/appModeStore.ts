/**
 * App Mode Store
 * Manages client/staff mode switching
 */

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export type AppMode = "client" | "staff";

interface AppModeState {
  mode: AppMode;
  isLoading: boolean;
  setMode: (mode: AppMode) => Promise<void>;
  loadMode: () => Promise<void>;
}

export const useAppModeStore = create<AppModeState>((set) => ({
  mode: "client",
  isLoading: true,

  setMode: async (mode: AppMode) => {
    await SecureStore.setItemAsync("vendhub_app_mode", mode);
    set({ mode });
  },

  loadMode: async () => {
    try {
      const saved = await SecureStore.getItemAsync("vendhub_app_mode");
      set({ mode: (saved as AppMode) || "client", isLoading: false });
    } catch {
      set({ mode: "client", isLoading: false });
    }
  },
}));
