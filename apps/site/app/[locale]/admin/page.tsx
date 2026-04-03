"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShoppingBag, MapPin, Inbox, Tag, ArrowRight } from "lucide-react";
import { cmsGetAll } from "@/lib/admin-api";

interface StatCard {
  label: string;
  icon: React.ReactNode;
  count: number | null;
  subtitle?: string | null;
  href: string;
  color: string;
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const [stats, setStats] = useState({
    products: null as number | null,
    productsAvailable: null as number | null,
    machines: null as number | null,
    machinesOnline: null as number | null,
    newRequests: null as number | null,
    activePromotions: null as number | null,
    partners: null as number | null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          productsRes,
          machinesRes,
          requestsRes,
          promotionsRes,
          partnersRes,
        ] = await Promise.all([
          cmsGetAll("products"),
          cmsGetAll("machines"),
          cmsGetAll("cooperation_requests"),
          cmsGetAll("promotions"),
          cmsGetAll("partners"),
        ]);

        const productsData = Array.isArray(productsRes.data)
          ? productsRes.data
          : [];
        const machinesData = Array.isArray(machinesRes.data)
          ? machinesRes.data
          : [];
        const requestsData = Array.isArray(requestsRes.data)
          ? requestsRes.data
          : [];
        const promotionsData = Array.isArray(promotionsRes.data)
          ? promotionsRes.data
          : [];
        const partnersData = Array.isArray(partnersRes.data)
          ? partnersRes.data
          : [];

        setStats({
          products: productsRes.error ? null : productsData.length,
          productsAvailable: productsRes.error
            ? null
            : productsData.filter((p: Record<string, unknown>) => p.available)
                .length,
          machines: machinesRes.error ? null : machinesData.length,
          machinesOnline: machinesRes.error
            ? null
            : machinesData.filter(
                (m: Record<string, unknown>) => m.status === "online",
              ).length,
          newRequests: requestsRes.error
            ? null
            : requestsData.filter(
                (r: Record<string, unknown>) => r.status === "new",
              ).length,
          activePromotions: promotionsRes.error
            ? null
            : promotionsData.filter((p: Record<string, unknown>) => p.is_active)
                .length,
          partners: partnersRes.error ? null : partnersData.length,
        });
      } catch (err: unknown) {
        console.error("Dashboard stats fetch failed:", err);
      }
    }

    fetchStats();
  }, []);

  const cards: StatCard[] = [
    {
      label: t("products"),
      icon: <ShoppingBag size={24} />,
      count: stats.products,
      subtitle:
        stats.productsAvailable !== null
          ? t("available", { count: stats.productsAvailable })
          : null,
      href: "/admin/products",
      color: "bg-espresso/5 text-espresso",
    },
    {
      label: t("machines"),
      icon: <MapPin size={24} />,
      count: stats.machines,
      subtitle:
        stats.machinesOnline !== null
          ? t("online", { count: stats.machinesOnline })
          : null,
      href: "/admin/machines",
      color: "bg-mint/10 text-mint",
    },
    {
      label: t("newRequests"),
      icon: <Inbox size={24} />,
      count: stats.newRequests,
      href: "/admin/partnership",
      color: "bg-caramel/10 text-caramel-dark",
    },
    {
      label: t("activePromotions"),
      icon: <Tag size={24} />,
      count: stats.activePromotions,
      subtitle:
        stats.partners !== null
          ? t("partners", { count: stats.partners })
          : null,
      href: "/admin/promotions",
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-2xl border border-espresso/5 p-5 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}
              >
                {card.icon}
              </div>
              <ArrowRight
                size={16}
                className="text-espresso/20 group-hover:text-espresso/50 transition-colors mt-1"
              />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-espresso">
                {card.count !== null ? card.count : "..."}
              </div>
              <div className="text-sm text-espresso/50 mt-0.5">
                {card.label}
              </div>
              {card.subtitle && (
                <div className="text-xs text-espresso/30 mt-1">
                  {card.subtitle}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-espresso/5 p-6">
        <h2 className="text-base font-bold text-espresso mb-4">
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/admin/products"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-foam hover:bg-espresso/5 transition-colors text-sm font-medium text-espresso/70 hover:text-espresso"
          >
            <ShoppingBag size={16} />
            {t("manageProducts")}
          </Link>
          <Link
            href="/admin/machines"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-foam hover:bg-espresso/5 transition-colors text-sm font-medium text-espresso/70 hover:text-espresso"
          >
            <MapPin size={16} />
            {t("manageMachines")}
          </Link>
          <Link
            href="/admin/content"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-foam hover:bg-espresso/5 transition-colors text-sm font-medium text-espresso/70 hover:text-espresso"
          >
            <Tag size={16} />
            {t("editContent")}
          </Link>
          <Link
            href="/admin/partnership"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-foam hover:bg-espresso/5 transition-colors text-sm font-medium text-espresso/70 hover:text-espresso"
          >
            <Inbox size={16} />
            {t("viewRequests")}
          </Link>
        </div>
      </div>
    </div>
  );
}
