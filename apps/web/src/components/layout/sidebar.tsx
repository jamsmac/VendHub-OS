"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Coffee,
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  Users,
  MapPin,
  BarChart3,
  Settings,
  LogOut,
  MessageSquare,
  CreditCard,
  Bell,
  FileText,
  UserCog,
  Wrench,
  ShoppingCart,
  PackagePlus,
  Clock,
  Building2,
  Receipt,
  Plug,
  Database,
  Route,
  Map,
  Wallet,
  Cog,
  Upload,
  FileSpreadsheet,
  Scale,
  Building,
  Warehouse,
  AlertTriangle,
  ShieldAlert,
  Truck,
  Star,
  Webhook,
  KeyRound,
  DollarSign,
  BookOpen,
  TrendingUp,
  Globe,
  Tag,
  HelpCircle,
  Code2,
  UserPlus,
  Menu,
  Banknote,
  Trophy,
  Ticket,
  Swords,
  Share2,
  History,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useMemo, useState, useCallback } from "react";
import { UserRole } from "@vendhub/shared";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface NavItem {
  nameKey: string;
  fallback: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  section?: string;
}

/** Role groups for concise assignment */
const MANAGEMENT: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
];
const OPERATIONS: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OPERATOR,
];
const FINANCE: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.ACCOUNTANT,
];
const STOCK: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.WAREHOUSE,
];

export const navigation: NavItem[] = [
  // ── Dashboard ─────────────────────────────────────────────
  {
    nameKey: "dashboard",
    fallback: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "dashboard",
  },

  // ── Operations ────────────────────────────────────────────
  {
    nameKey: "machines",
    fallback: "Machines",
    href: "/dashboard/machines",
    icon: Coffee,
    roles: OPERATIONS,
    section: "operations",
  },
  {
    nameKey: "products",
    fallback: "Products",
    href: "/dashboard/products",
    icon: Package,
    roles: [...OPERATIONS, UserRole.WAREHOUSE],
    section: "operations",
  },
  {
    nameKey: "inventory",
    fallback: "Inventory",
    href: "/dashboard/inventory",
    icon: Boxes,
    roles: STOCK,
    section: "operations",
  },
  {
    nameKey: "orders",
    fallback: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    roles: [...MANAGEMENT, UserRole.ACCOUNTANT],
    section: "operations",
  },
  {
    nameKey: "tasks",
    fallback: "Tasks",
    href: "/dashboard/tasks",
    icon: ClipboardList,
    roles: OPERATIONS,
    section: "operations",
  },
  {
    nameKey: "collections",
    fallback: "Collections",
    href: "/dashboard/collections",
    icon: Wallet,
    roles: [...OPERATIONS, UserRole.ACCOUNTANT],
    section: "operations",
  },
  {
    nameKey: "routes",
    fallback: "Routes",
    href: "/dashboard/routes",
    icon: Route,
    roles: OPERATIONS,
    section: "operations",
  },
  {
    nameKey: "maintenance",
    fallback: "Maintenance",
    href: "/dashboard/maintenance",
    icon: Wrench,
    roles: OPERATIONS,
    section: "operations",
  },
  {
    nameKey: "containers",
    fallback: "Containers",
    href: "/dashboard/containers",
    icon: Boxes,
    roles: OPERATIONS,
    section: "operations",
  },
  {
    nameKey: "equipment",
    fallback: "Equipment",
    href: "/dashboard/equipment",
    icon: Cog,
    roles: OPERATIONS,
    section: "operations",
  },
  {
    nameKey: "materialRequests",
    fallback: "Material Requests",
    href: "/dashboard/material-requests",
    icon: PackagePlus,
    roles: [...OPERATIONS, UserRole.WAREHOUSE],
    section: "operations",
  },
  {
    nameKey: "complaints",
    fallback: "Complaints",
    href: "/dashboard/complaints",
    icon: MessageSquare,
    roles: MANAGEMENT,
    section: "operations",
  },
  {
    nameKey: "incidents",
    fallback: "Incidents",
    href: "/dashboard/incidents",
    icon: ShieldAlert,
    roles: OPERATIONS,
    section: "operations",
  },
  {
    nameKey: "alerts",
    fallback: "Alerts",
    href: "/dashboard/alerts",
    icon: AlertTriangle,
    roles: OPERATIONS,
    section: "operations",
  },
  {
    nameKey: "vehicles",
    fallback: "Vehicles",
    href: "/dashboard/vehicles",
    icon: Truck,
    roles: OPERATIONS,
    section: "operations",
  },
  {
    nameKey: "operatorRatings",
    fallback: "Ratings",
    href: "/dashboard/operator-ratings",
    icon: Star,
    roles: MANAGEMENT,
    section: "operations",
  },

  // ── Finance ───────────────────────────────────────────────
  {
    nameKey: "transactions",
    fallback: "Transactions",
    href: "/dashboard/transactions",
    icon: CreditCard,
    roles: [...MANAGEMENT, UserRole.ACCOUNTANT],
    section: "finance",
  },
  {
    nameKey: "payments",
    fallback: "Payments",
    href: "/dashboard/payments",
    icon: Wallet,
    roles: FINANCE,
    section: "finance",
  },
  {
    nameKey: "finance",
    fallback: "Finance",
    href: "/dashboard/finance",
    icon: DollarSign,
    roles: FINANCE,
    section: "finance",
  },
  {
    nameKey: "counterparty",
    fallback: "Counterparties",
    href: "/dashboard/counterparties",
    icon: Building2,
    roles: [...MANAGEMENT, UserRole.ACCOUNTANT],
    section: "finance",
  },
  {
    nameKey: "fiscal",
    fallback: "Fiscalization",
    href: "/dashboard/fiscal",
    icon: Receipt,
    roles: FINANCE,
    section: "finance",
  },
  {
    nameKey: "reconciliation",
    fallback: "Reconciliation",
    href: "/dashboard/reconciliation",
    icon: Scale,
    roles: FINANCE,
    section: "finance",
  },
  {
    nameKey: "paymentReports",
    fallback: "Payment Reports",
    href: "/dashboard/payment-reports",
    icon: FileSpreadsheet,
    roles: FINANCE,
    section: "finance",
  },
  {
    nameKey: "openingBalances",
    fallback: "Opening Balances",
    href: "/dashboard/opening-balances",
    icon: DollarSign,
    roles: FINANCE,
    section: "finance",
  },
  {
    nameKey: "payoutRequests",
    fallback: "Payout Requests",
    href: "/dashboard/payout-requests",
    icon: Banknote,
    roles: [...FINANCE, UserRole.MANAGER, UserRole.OPERATOR],
    section: "finance",
  },
  {
    nameKey: "purchaseHistory",
    fallback: "Purchase History",
    href: "/dashboard/purchase-history",
    icon: History,
    roles: [...MANAGEMENT, UserRole.ACCOUNTANT],
    section: "finance",
  },

  // ── Marketing & Sales ─────────────────────────────────────
  {
    nameKey: "promotions",
    fallback: "Promotions",
    href: "/dashboard/loyalty/promo-codes",
    icon: Tag,
    roles: MANAGEMENT,
    section: "marketing",
  },
  {
    nameKey: "investor",
    fallback: "Investors",
    href: "/dashboard/investor",
    icon: TrendingUp,
    roles: MANAGEMENT,
    section: "marketing",
  },
  {
    nameKey: "loyalty",
    fallback: "Loyalty & Promo",
    href: "/dashboard/loyalty",
    icon: Star,
    roles: MANAGEMENT,
    section: "marketing",
  },
  {
    nameKey: "achievements",
    fallback: "Achievements",
    href: "/dashboard/loyalty/achievements",
    icon: Trophy,
    roles: MANAGEMENT,
    section: "marketing",
  },
  {
    nameKey: "promoCodes",
    fallback: "Promo Codes",
    href: "/dashboard/loyalty/promo-codes",
    icon: Ticket,
    roles: MANAGEMENT,
    section: "marketing",
  },
  {
    nameKey: "quests",
    fallback: "Quests",
    href: "/dashboard/loyalty/quests",
    icon: Swords,
    roles: MANAGEMENT,
    section: "marketing",
  },
  {
    nameKey: "referrals",
    fallback: "Referrals",
    href: "/dashboard/referrals",
    icon: Share2,
    roles: MANAGEMENT,
    section: "marketing",
  },

  // ── HR & Management ───────────────────────────────────────
  {
    nameKey: "employees",
    fallback: "Employees",
    href: "/dashboard/employees",
    icon: UserCog,
    roles: MANAGEMENT,
    section: "hr",
  },
  {
    nameKey: "contractors",
    fallback: "Contractors",
    href: "/dashboard/contractors",
    icon: Building2,
    roles: MANAGEMENT,
    section: "hr",
  },
  {
    nameKey: "team",
    fallback: "Team+",
    href: "/dashboard/team",
    icon: Users,
    roles: MANAGEMENT,
    section: "hr",
  },
  {
    nameKey: "workLogs",
    fallback: "Work Logs",
    href: "/dashboard/work-logs",
    icon: Clock,
    roles: MANAGEMENT,
    section: "hr",
  },

  // ── Admin & Configuration ─────────────────────────────────
  {
    nameKey: "organizations",
    fallback: "Organizations",
    href: "/dashboard/organizations",
    icon: Building,
    roles: [UserRole.OWNER],
    section: "admin",
  },
  {
    nameKey: "users",
    fallback: "Users",
    href: "/dashboard/users",
    icon: Users,
    roles: [UserRole.OWNER, UserRole.ADMIN],
    section: "admin",
  },
  {
    nameKey: "invites",
    fallback: "Invites",
    href: "/dashboard/invites",
    icon: UserPlus,
    roles: [UserRole.OWNER, UserRole.ADMIN],
    section: "admin",
  },
  {
    nameKey: "warehouse",
    fallback: "Warehouses",
    href: "/dashboard/warehouse",
    icon: Warehouse,
    roles: STOCK,
    section: "admin",
  },
  {
    nameKey: "locations",
    fallback: "Locations",
    href: "/dashboard/locations",
    icon: MapPin,
    roles: MANAGEMENT,
    section: "admin",
  },
  {
    nameKey: "website",
    fallback: "Website",
    href: "/dashboard/website",
    icon: Globe,
    roles: MANAGEMENT,
    section: "admin",
  },
  {
    nameKey: "map",
    fallback: "Map",
    href: "/dashboard/map",
    icon: Map,
    roles: [...OPERATIONS, UserRole.WAREHOUSE],
    section: "admin",
  },

  // ── Reporting ─────────────────────────────────────────────
  {
    nameKey: "reports",
    fallback: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: [...MANAGEMENT, UserRole.ACCOUNTANT],
    section: "reporting",
  },
  {
    nameKey: "analytics",
    fallback: "Analytics",
    href: "/dashboard/analytics",
    icon: TrendingUp,
    roles: MANAGEMENT,
    section: "reporting",
  },
  {
    nameKey: "routeAnalytics",
    fallback: "Route Analytics",
    href: "/dashboard/routes/analytics",
    icon: Route,
    roles: MANAGEMENT,
    section: "reporting",
  },

  // ── Support & Help ────────────────────────────────────────
  {
    nameKey: "help",
    fallback: "Help",
    href: "/dashboard/help",
    icon: HelpCircle,
    section: "support",
  },

  // ── System ────────────────────────────────────────────────
  {
    nameKey: "directories",
    fallback: "Master Data",
    href: "/dashboard/directories",
    icon: Database,
    roles: MANAGEMENT,
    section: "system",
  },
  {
    nameKey: "importData",
    fallback: "Import",
    href: "/dashboard/import",
    icon: Upload,
    roles: [UserRole.OWNER, UserRole.ADMIN],
    section: "system",
  },
  {
    nameKey: "integrations",
    fallback: "Integrations",
    href: "/dashboard/integrations",
    icon: Plug,
    roles: [UserRole.OWNER, UserRole.ADMIN],
    section: "system",
  },
  {
    nameKey: "webhooks",
    fallback: "Webhooks",
    href: "/dashboard/webhooks",
    icon: Webhook,
    roles: [UserRole.OWNER, UserRole.ADMIN],
    section: "system",
  },
  {
    nameKey: "machineAccess",
    fallback: "Machine Access",
    href: "/dashboard/machine-access",
    icon: KeyRound,
    roles: MANAGEMENT,
    section: "system",
  },
  {
    nameKey: "references",
    fallback: "Reference Data",
    href: "/dashboard/references",
    icon: BookOpen,
    roles: [UserRole.OWNER, UserRole.ADMIN],
    section: "system",
  },
  {
    nameKey: "apiDocs",
    fallback: "API Documentation",
    href: "/dashboard/api-docs",
    icon: Code2,
    roles: [UserRole.OWNER],
    section: "system",
  },
  {
    nameKey: "audit",
    fallback: "Audit",
    href: "/dashboard/audit",
    icon: FileText,
    roles: [UserRole.OWNER, UserRole.ADMIN],
    section: "system",
  },

  // Notifications — visible to all authenticated roles
  {
    nameKey: "notifications",
    fallback: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    section: "general",
  },
  {
    nameKey: "settings",
    fallback: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: [UserRole.OWNER, UserRole.ADMIN],
    section: "general",
  },
];

/** Section labels for visual grouping (Issue #11) */
const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  operations: "Operations",
  finance: "Finance",
  marketing: "Marketing",
  hr: "HR",
  admin: "Admin",
  reporting: "Reporting",
  support: "Support",
  system: "System",
  general: "General",
};

/** Shared nav content used by both desktop sidebar and mobile sheet */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const tSections = useTranslations("navSections");

  const visibleNavigation = useMemo(() => {
    const role = user?.role as UserRole | undefined;
    if (!role) return navigation;

    return navigation.filter(
      (item) => !item.roles || item.roles.includes(role),
    );
  }, [user?.role]);

  // Group items by section for visual dividers (Issue #11)
  const groupedNav = useMemo(() => {
    const groups: { section: string; items: NavItem[] }[] = [];
    let currentSection = "";

    for (const item of visibleNavigation) {
      const section = item.section || "general";
      if (section !== currentSection) {
        currentSection = section;
        groups.push({ section, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }, [visibleNavigation]);

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Coffee
            className="w-5 h-5 text-primary-foreground"
            aria-hidden="true"
          />
        </div>
        <span className="font-bold text-lg">VendHub</span>
      </div>

      {/* Navigation with section dividers (Issue #6 + #11) */}
      <nav
        className="flex-1 px-3 py-4 overflow-y-auto"
        aria-label="Main navigation"
      >
        {groupedNav.map((group, groupIndex) => (
          <div key={group.section}>
            {groupIndex > 0 && (
              <>
                <div className="my-2 border-t" />
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {tSections.has(group.section)
                    ? tSections(group.section)
                    : SECTION_LABELS[group.section] || group.section}
                </p>
              </>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.nameKey}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {t.has(item.nameKey) ? t(item.nameKey) : item.fallback}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + Locale + Logout */}
      <div className="border-t p-3 space-y-2">
        {user && (
          <div className="px-3 py-1">
            <p className="text-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
        )}
        <div className="px-3 py-1">
          <LocaleSwitcher />
        </div>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {tAuth("logout")}
        </button>
      </div>
    </>
  );
}

/** Desktop sidebar — hidden on mobile (Issue #1) */
export function Sidebar() {
  return (
    <div className="hidden lg:flex h-full w-64 flex-col bg-card/40 backdrop-blur-2xl border-r border-border/50">
      <SidebarContent />
    </div>
  );
}

/** Mobile sidebar trigger — visible only on small screens (Issue #1) */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const t = useTranslations("nav");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={
            t.has("openMenu") ? t("openMenu") : "Open navigation menu"
          }
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">
          {t.has("navigation") ? t("navigation") : "Navigation menu"}
        </SheetTitle>
        <div className="flex h-full flex-col bg-card">
          <SidebarContent onNavigate={close} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
