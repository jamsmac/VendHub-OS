import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/types";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  lastLogin?: string;
}

interface AppState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: "vendhub-app",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
