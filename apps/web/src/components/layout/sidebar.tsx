"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useMemo } from "react";

type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "operator"
  | "warehouse"
  | "accountant"
  | "viewer";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const MANAGEMENT: UserRole[] = ["owner", "admin", "manager"];
const OPERATIONS: UserRole[] = ["owner", "admin", "manager", "operator"];
const FINANCE: UserRole[] = ["owner", "admin", "accountant"];
const STOCK: UserRole[] = ["owner", "admin", "manager", "warehouse"];

const navigation: NavItem[] = [
  // Everyone sees the dashboard
  { name: "Дашборд", href: "/dashboard", icon: LayoutDashboard },

  // Operations
  {
    name: "Автоматы",
    href: "/dashboard/machines",
    icon: Coffee,
    roles: OPERATIONS,
  },
  {
    name: "Товары",
    href: "/dashboard/products",
    icon: Package,
    roles: [...OPERATIONS, "warehouse"],
  },
  { name: "Склад", href: "/dashboard/inventory", icon: Boxes, roles: STOCK },
  {
    name: "Заказы",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    roles: MANAGEMENT,
  },
  {
    name: "Задачи",
    href: "/dashboard/tasks",
    icon: ClipboardList,
    roles: OPERATIONS,
  },
  {
    name: "Рейсы",
    href: "/dashboard/trips",
    icon: Navigation,
    roles: OPERATIONS,
  },
  {
    name: "Маршруты",
    href: "/dashboard/routes",
    icon: Route,
    roles: MANAGEMENT,
  },
  {
    name: "Техобслуживание",
    href: "/dashboard/maintenance",
    icon: Wrench,
    roles: OPERATIONS,
  },
  {
    name: "Заявки",
    href: "/dashboard/material-requests",
    icon: PackagePlus,
    roles: [...OPERATIONS, "warehouse"],
  },
  {
    name: "Жалобы",
    href: "/dashboard/complaints",
    icon: MessageSquare,
    roles: MANAGEMENT,
  },

  // Finance
  {
    name: "Транзакции",
    href: "/dashboard/transactions",
    icon: CreditCard,
    roles: FINANCE,
  },

  // HR
  {
    name: "Сотрудники",
    href: "/dashboard/employees",
    icon: UserCog,
    roles: MANAGEMENT,
  },
  {
    name: "Подрядчики",
    href: "/dashboard/contractors",
    icon: Building2,
    roles: MANAGEMENT,
  },
  {
    name: "Табель",
    href: "/dashboard/work-logs",
    icon: Clock,
    roles: MANAGEMENT,
  },

  // Admin
  {
    name: "Пользователи",
    href: "/dashboard/users",
    icon: Users,
    roles: ["owner", "admin"],
  },
  {
    name: "Локации",
    href: "/dashboard/locations",
    icon: MapPin,
    roles: MANAGEMENT,
  },
  {
    name: "Карта",
    href: "/dashboard/map",
    icon: Map,
    roles: [...OPERATIONS, "warehouse"],
  },
  { name: "Бонусы", href: "/dashboard/loyalty", icon: Gift, roles: MANAGEMENT },

  // Reporting
  {
    name: "Отчёты",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: [...MANAGEMENT, "accountant"],
  },
  {
    name: "Фискализация",
    href: "/dashboard/fiscal",
    icon: Receipt,
    roles: FINANCE,
  },

  // System
  {
    name: "Мастер-данные",
    href: "/dashboard/directories",
    icon: Database,
    roles: MANAGEMENT,
  },
  {
    name: "Интеграции",
    href: "/dashboard/integrations",
    icon: Plug,
    roles: ["owner", "admin"],
  },
  {
    name: "Аудит",
    href: "/dashboard/audit",
    icon: FileText,
    roles: ["owner", "admin"],
  },
  { name: "Уведомления", href: "/dashboard/notifications", icon: Bell },
  {
    name: "Настройки",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["owner", "admin"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

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
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="border-t p-3 space-y-2">
        {user && (
          <div className="px-3 py-1">
            <p className="text-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </div>
  );
}
