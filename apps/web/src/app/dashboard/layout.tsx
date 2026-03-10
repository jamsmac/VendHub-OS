"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { getAccessToken } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);
  const hasChecked = useRef(false);

  // Wait for zustand persist to finish rehydrating from localStorage.
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setHydrated(true);
      });
      return unsub;
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const token = getAccessToken();

    // All auth state is consistent — allow access
    if (token && isAuthenticated && user) {
      setReady(true);
      return;
    }

    // No token at all — definitely not authenticated
    if (!token) {
      router.replace("/auth");
      return;
    }

    // Token exists but user/isAuthenticated not synced yet.
    // Verify once via API instead of immediately redirecting.
    if (!hasChecked.current) {
      hasChecked.current = true;
      checkAuth();
    }
  }, [hydrated, isAuthenticated, user, router, checkAuth]);

  if (!ready) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
