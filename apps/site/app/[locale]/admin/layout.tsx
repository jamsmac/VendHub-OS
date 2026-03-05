"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { ToastProvider } from "@/components/ui/Toast";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

const pageTitleKeys: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/products": "products",
  "/admin/machines": "machines",
  "/admin/machine-types": "machineTypes",
  "/admin/promotions": "promotions",
  "/admin/bonus-actions": "bonusActions",
  "/admin/loyalty": "loyalty",
  "/admin/content": "content",
  "/admin/partnership": "partnership",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("admin.sidebar");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cooperationNewCount, setCooperationNewCount] = useState(0);

  // Login page is handled separately — no auth guard needed
  const isLoginPage = pathname.endsWith("/admin/login");

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!data.session && !isLoginPage) {
          router.push("/admin/login");
          return;
        }
        if (data.session) {
          setEmail(data.session.user.email ?? null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Admin auth check failed:", err);
        if (!isLoginPage) router.push("/admin/login");
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session && !isLoginPage) {
          router.push("/admin/login");
        }
        if (session) {
          setEmail(session.user.email ?? null);
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [isLoginPage, router]);

  // Fetch new cooperation requests count
  const fetchCooperationCount = useCallback(() => {
    supabase
      .from("cooperation_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .then(({ count }) => {
        setCooperationNewCount(count ?? 0);
      });
  }, []);

  useEffect(() => {
    if (loading || isLoginPage) return;
    fetchCooperationCount();
  }, [loading, isLoginPage, pathname, fetchCooperationCount]);

  // Listen for cooperation status changes from child pages
  useEffect(() => {
    const handler = () => fetchCooperationCount();
    window.addEventListener("cooperation-updated", handler);
    return () => window.removeEventListener("cooperation-updated", handler);
  }, [fetchCooperationCount]);

  // Login page — render without sidebar/header
  if (isLoginPage) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-foam">
        <div className="text-espresso/50 text-sm">{tc("loading")}</div>
      </div>
    );
  }

  // Strip locale prefix to match pageTitleKeys
  const strippedPath = pathname.replace(/^\/[a-z]{2}(?=\/admin)/, "");
  const titleKey = pageTitleKeys[strippedPath];
  const pageTitle = titleKey ? t(titleKey) : t("adminPanel");

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-foam">
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          cooperationNewCount={cooperationNewCount}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title={pageTitle}
            email={email}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
