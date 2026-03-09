"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  useEffect(() => {
    // Wait for zustand persist to rehydrate from localStorage
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      checkAuth();
    }
  }, [hydrated, checkAuth]);

  useEffect(() => {
    // Only redirect after hydration to avoid race with localStorage rehydration
    if (hydrated && !isAuthenticated) {
      router.push("/auth");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
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
