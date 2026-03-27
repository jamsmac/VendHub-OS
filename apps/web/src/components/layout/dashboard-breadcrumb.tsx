"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Map route segments to i18n keys */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "dashboard",
  products: "products",
  machines: "machines",
  orders: "orders",
  users: "users",
  settings: "settings",
  tasks: "tasks",
  locations: "locations",
  inventory: "inventory",
  complaints: "complaints",
  payments: "payments",
  reports: "reports",
  collections: "collections",
  analytics: "analytics",
  containers: "containers",
  achievements: "achievements",
  quests: "quests",
  referrals: "referrals",
  "promo-codes": "promoCodes",
  "payment-reports": "paymentReports",
  "trip-analytics": "tripAnalytics",
  reconciliation: "reconciliation",
  organizations: "organizations",
  "operator-ratings": "operatorRatings",
  team: "team",
  fiscal: "fiscal",
  references: "references",
  promotions: "promotions",
  counterparty: "counterparty",
  maintenance: "maintenance",
  vehicles: "vehicles",
  warehouse: "warehouse",
  routes: "routes",
  builder: "builder",
  new: "new",
  edit: "edit",
};

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "dashboard");

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/dashboard/" + segments.slice(0, index + 1).join("/");
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment,
      );
    const labelKey = SEGMENT_LABELS[segment];
    const label = isUuid
      ? "..."
      : labelKey
        ? t(labelKey) || segment
        : segment.replace(/-/g, " ");
    const isLast = index === segments.length - 1;

    return { href, label, isLast, isUuid };
  });

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb) => (
          <span key={crumb.href} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
