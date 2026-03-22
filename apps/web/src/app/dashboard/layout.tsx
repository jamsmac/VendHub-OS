"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
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

    // All auth state is consistent — allow access
    if (isAuthenticated && user) {
      setReady(true);
      return;
    }

    // No persisted auth state — definitely not authenticated
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }

    // Persisted isAuthenticated but no user data (page refresh).
    // httpOnly cookie is still valid — verify once via API.
    if (!hasChecked.current) {
      hasChecked.current = true;
      checkAuth();
    }
  }, [hydrated, isAuthenticated, user, router, checkAuth]);

  // Loading state during auth check (Issue #17)
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div
          className="flex flex-col items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
