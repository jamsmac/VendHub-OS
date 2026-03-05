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
  Navigation,
  Route,
  Gift,
  Map,
  Wallet,
  Cog,
  Upload,
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
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useMemo } from "react";
import { UserRole } from "@vendhub/shared";
import { LocaleSwitcher } from "@/components/locale-switcher";

interface NavItem {
  nameKey: string;
  fallback: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
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

const navigation: NavItem[] = [
  // ── Dashboard ─────────────────────────────────────────────
  {
    nameKey: "dashboard",
    fallback: "Дашборд",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    nameKey: "dashboardExtended",
    fallback: "Расширенный обзор",
    href: "/dashboard/dashboard",
    icon: LayoutDashboard,
  },

  // ── Operations ────────────────────────────────────────────
  {
    nameKey: "machines",
    fallback: "Автоматы",
    href: "/dashboard/machines",
    icon: Coffee,
    roles: OPERATIONS,
  },
  {
    nameKey: "products",
    fallback: "Товары",
    href: "/dashboard/products",
    icon: Package,
    roles: [...OPERATIONS, UserRole.WAREHOUSE],
  },
  {
    nameKey: "inventory",
    fallback: "Склад",
    href: "/dashboard/inventory",
    icon: Boxes,
    roles: STOCK,
  },
  {
    nameKey: "orders",
    fallback: "Заказы",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    roles: [...MANAGEMENT, UserRole.ACCOUNTANT],
  },
  {
    nameKey: "tasks",
    fallback: "Задачи",
    href: "/dashboard/tasks",
    icon: ClipboardList,
    roles: OPERATIONS,
  },
  {
    nameKey: "trips",
    fallback: "Рейсы",
    href: "/dashboard/trips",
    icon: Navigation,
    roles: OPERATIONS,
  },
  {
    nameKey: "routes",
    fallback: "Маршруты",
    href: "/dashboard/routes",
    icon: Route,
    roles: MANAGEMENT,
  },
  {
    nameKey: "maintenance",
    fallback: "Техобслуживание",
    href: "/dashboard/maintenance",
    icon: Wrench,
    roles: OPERATIONS,
  },
  {
    nameKey: "equipment",
    fallback: "Оборудование",
    href: "/dashboard/equipment",
    icon: Cog,
    roles: OPERATIONS,
  },
  {
    nameKey: "materialRequests",
    fallback: "Заявки",
    href: "/dashboard/material-requests",
    icon: PackagePlus,
    roles: [...OPERATIONS, UserRole.WAREHOUSE],
  },
  {
    nameKey: "complaints",
    fallback: "Жалобы",
    href: "/dashboard/complaints",
    icon: MessageSquare,
    roles: MANAGEMENT,
  },
  {
    nameKey: "incidents",
    fallback: "Инциденты",
    href: "/dashboard/incidents",
    icon: ShieldAlert,
    roles: OPERATIONS,
  },
  {
    nameKey: "alerts",
    fallback: "Алерты",
    href: "/dashboard/alerts",
    icon: AlertTriangle,
    roles: OPERATIONS,
  },
  {
    nameKey: "vehicles",
    fallback: "Транспорт",
    href: "/dashboard/vehicles",
    icon: Truck,
    roles: OPERATIONS,
  },
  {
    nameKey: "operatorRatings",
    fallback: "Рейтинги",
    href: "/dashboard/operator-ratings",
    icon: Star,
    roles: MANAGEMENT,
  },

  // ── Finance ───────────────────────────────────────────────
  {
    nameKey: "transactions",
    fallback: "Транзакции",
    href: "/dashboard/transactions",
    icon: CreditCard,
    roles: [...MANAGEMENT, UserRole.ACCOUNTANT],
  },
  {
    nameKey: "payments",
    fallback: "Платежи",
    href: "/dashboard/payments",
    icon: Wallet,
    roles: FINANCE,
  },
  {
    nameKey: "finance",
    fallback: "Финансы",
    href: "/dashboard/finance",
    icon: DollarSign,
    roles: FINANCE,
  },
  {
    nameKey: "fiscal",
    fallback: "Фискализация",
    href: "/dashboard/fiscal",
    icon: Receipt,
    roles: FINANCE,
  },
  {
    nameKey: "reconciliation",
    fallback: "Сверка",
    href: "/dashboard/reconciliation",
    icon: Scale,
    roles: FINANCE,
  },
  {
    nameKey: "openingBalances",
    fallback: "Нач. остатки",
    href: "/dashboard/opening-balances",
    icon: DollarSign,
    roles: FINANCE,
  },

  // ── Marketing & Sales ─────────────────────────────────────
  {
    nameKey: "promotions",
    fallback: "Акции",
    href: "/dashboard/promotions",
    icon: Tag,
    roles: MANAGEMENT,
  },
  {
    nameKey: "investor",
    fallback: "Инвесторы",
    href: "/dashboard/investor",
    icon: TrendingUp,
    roles: MANAGEMENT,
  },

  // ── HR & Management ───────────────────────────────────────
  {
    nameKey: "employees",
    fallback: "Сотрудники",
    href: "/dashboard/employees",
    icon: UserCog,
    roles: MANAGEMENT,
  },
  {
    nameKey: "contractors",
    fallback: "Подрядчики",
    href: "/dashboard/contractors",
    icon: Building2,
    roles: MANAGEMENT,
  },
  {
    nameKey: "counterparties",
    fallback: "Контрагенты",
    href: "/dashboard/counterparties",
    icon: Building,
    roles: MANAGEMENT,
  },
  {
    nameKey: "team",
    fallback: "Команда+",
    href: "/dashboard/team",
    icon: Users,
    roles: MANAGEMENT,
  },
  {
    nameKey: "workLogs",
    fallback: "Табель",
    href: "/dashboard/work-logs",
    icon: Clock,
    roles: MANAGEMENT,
  },

  // ── Admin & Configuration ─────────────────────────────────
  {
    nameKey: "organizations",
    fallback: "Организации",
    href: "/dashboard/organizations",
    icon: Building,
    roles: [UserRole.OWNER],
  },
  {
    nameKey: "users",
    fallback: "Пользователи",
    href: "/dashboard/users",
    icon: Users,
    roles: [UserRole.OWNER, UserRole.ADMIN],
  },
  {
    nameKey: "warehouse",
    fallback: "Склады",
    href: "/dashboard/warehouse",
    icon: Warehouse,
    roles: STOCK,
  },
  {
    nameKey: "locations",
    fallback: "Локации",
    href: "/dashboard/locations",
    icon: MapPin,
    roles: MANAGEMENT,
  },
  {
    nameKey: "website",
    fallback: "Сайт",
    href: "/dashboard/website",
    icon: Globe,
    roles: MANAGEMENT,
  },
  {
    nameKey: "map",
    fallback: "Карта",
    href: "/dashboard/map",
    icon: Map,
    roles: [...OPERATIONS, UserRole.WAREHOUSE],
  },
  {
    nameKey: "loyalty",
    fallback: "Бонусы",
    href: "/dashboard/loyalty",
    icon: Gift,
    roles: MANAGEMENT,
  },

  // ── Reporting ─────────────────────────────────────────────
  {
    nameKey: "reports",
    fallback: "Отчёты",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: [...MANAGEMENT, UserRole.ACCOUNTANT],
  },

  // ── Support & Help ────────────────────────────────────────
  {
    nameKey: "help",
    fallback: "Помощь",
    href: "/dashboard/help",
    icon: HelpCircle,
  },

  // ── System ────────────────────────────────────────────────
  {
    nameKey: "directories",
    fallback: "Мастер-данные",
    href: "/dashboard/directories",
    icon: Database,
    roles: MANAGEMENT,
  },
  {
    nameKey: "importData",
    fallback: "Импорт",
    href: "/dashboard/import",
    icon: Upload,
    roles: [UserRole.OWNER, UserRole.ADMIN],
  },
  {
    nameKey: "integrations",
    fallback: "Интеграции",
    href: "/dashboard/integrations",
    icon: Plug,
    roles: [UserRole.OWNER, UserRole.ADMIN],
  },
  {
    nameKey: "webhooks",
    fallback: "Вебхуки",
    href: "/dashboard/webhooks",
    icon: Webhook,
    roles: [UserRole.OWNER, UserRole.ADMIN],
  },
  {
    nameKey: "machineAccess",
    fallback: "Доступ к автоматам",
    href: "/dashboard/machine-access",
    icon: KeyRound,
    roles: MANAGEMENT,
  },
  {
    nameKey: "references",
    fallback: "Справочники НСИ",
    href: "/dashboard/references",
    icon: BookOpen,
    roles: [UserRole.OWNER, UserRole.ADMIN],
  },
  {
    nameKey: "audit",
    fallback: "Аудит",
    href: "/dashboard/audit",
    icon: FileText,
    roles: [UserRole.OWNER, UserRole.ADMIN],
  },

  // Notifications — visible to all authenticated roles
  {
    nameKey: "notifications",
    fallback: "Уведомления",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    nameKey: "settings",
    fallback: "Настройки",
    href: "/dashboard/settings",
    icon: Settings,
    roles: [UserRole.OWNER, UserRole.ADMIN],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");

  const visibleNavigation = useMemo(() => {
    const role = user?.role as UserRole | undefined;
    if (!role) return navigation;

    return navigation.filter(
      (item) => !item.roles || item.roles.includes(role),
    );
  }, [user?.role]);

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Coffee className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">VendHub</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {visibleNavigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.nameKey}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {t.has(item.nameKey) ? t(item.nameKey) : item.fallback}
            </Link>
          );
        })}
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
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {tAuth("logout")}
        </button>
      </div>
    </div>
  );
}
