"use client";

import {
  Crown,
  Shield,
  Briefcase,
  UserCheck,
  Layers,
  BarChart3,
  Eye,
  Zap,
  Settings,
  Building,
  FileText,
  Target,
  Users,
  Plus,
  Edit3,
  Trash2,
} from "lucide-react";

export type EmployeeStatus =
  | "active"
  | "away"
  | "inactive"
  | "suspended"
  | "invited";

export const ROLE_META: Record<
  string,
  {
    label: string;
    color: string;
    icon: typeof Crown;
    description: string;
    isSystem: boolean;
  }
> = {
  owner: {
    label: "Владелец",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Crown,
    description: "Полный доступ и владение системой",
    isSystem: true,
  },
  admin: {
    label: "Администратор",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    icon: Shield,
    description: "Полный доступ ко всем функциям",
    isSystem: true,
  },
  manager: {
    label: "Менеджер",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Briefcase,
    description: "Управление операциями и персоналом",
    isSystem: true,
  },
  operator: {
    label: "Оператор",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: UserCheck,
    description: "Обслуживание и заправка автоматов",
    isSystem: false,
  },
  warehouse: {
    label: "Склад",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Layers,
    description: "Управление складом и запасами",
    isSystem: false,
  },
  accountant: {
    label: "Бухгалтер",
    color:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    icon: BarChart3,
    description: "Финансы и отчётность",
    isSystem: false,
  },
  viewer: {
    label: "Наблюдатель",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: Eye,
    description: "Только просмотр данных",
    isSystem: false,
  },
};

export const STATUS_META: Record<
  EmployeeStatus,
  { label: string; color: string; dot: string }
> = {
  active: {
    label: "Активен",
    color: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  away: { label: "Отсутствует", color: "text-amber-600", dot: "bg-amber-500" },
  inactive: { label: "Неактивен", color: "text-gray-500", dot: "bg-gray-400" },
  suspended: {
    label: "Приостановлен",
    color: "text-red-600",
    dot: "bg-red-500",
  },
  invited: { label: "Приглашён", color: "text-blue-600", dot: "bg-blue-500" },
};

export const DEPARTMENTS = [
  {
    id: "management",
    name: "Руководство",
    icon: Crown,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    id: "operations",
    name: "Операции",
    icon: Zap,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    id: "service",
    name: "Сервис",
    icon: Settings,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "finance",
    name: "Финансы",
    icon: Shield,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    id: "analytics",
    name: "Аналитика",
    icon: BarChart3,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
  },
];

export const ZONES = [
  "Мирзо-Улугбекский",
  "Юнусабадский",
  "Чиланзарский",
  "Яккасарайский",
  "Сирдарёвский",
  "Алмазарский",
  "Шайхантахурский",
  "Ташкентский",
  "Бектемирский",
];

export const SHIFT_TYPES = [
  {
    id: "morning",
    name: "Утро",
    time: "06:00-14:00",
    color: "bg-amber-100 text-amber-800",
  },
  {
    id: "day",
    name: "День",
    time: "10:00-18:00",
    color: "bg-blue-100 text-blue-800",
  },
  {
    id: "evening",
    name: "Вечер",
    time: "14:00-22:00",
    color: "bg-purple-100 text-purple-800",
  },
];

export const PERMISSION_CATEGORIES = [
  {
    id: "machines",
    name: "Автоматы",
    icon: Building,
    perms: [
      "machines_view",
      "machines_edit",
      "machines_config",
      "machines_full",
    ],
  },
  {
    id: "inventory",
    name: "Склад",
    icon: Layers,
    perms: [
      "inventory_view",
      "inventory_refill",
      "inventory_transfer",
      "inventory_full",
    ],
  },
  {
    id: "tasks",
    name: "Задачи",
    icon: Target,
    perms: ["tasks_view", "tasks_create", "tasks_assign", "tasks_manage"],
  },
  {
    id: "finance",
    name: "Финансы",
    icon: Shield,
    perms: ["finance_view", "finance_reports", "collections", "finance_full"],
  },
  {
    id: "reports",
    name: "Отчёты",
    icon: FileText,
    perms: ["reports_view", "analytics", "export", "reports_create"],
  },
  {
    id: "team",
    name: "Команда",
    icon: Users,
    perms: ["staff_view", "staff_manage", "roles_manage", "full_access"],
  },
];

export const ROLE_PERMS_MATRIX: Record<string, string[]> = {
  owner: ["full_access"],
  admin: [
    "machines_full",
    "inventory_full",
    "tasks_manage",
    "finance_full",
    "reports_create",
    "staff_manage",
    "roles_manage",
  ],
  manager: [
    "machines_edit",
    "machines_view",
    "inventory_transfer",
    "inventory_view",
    "tasks_assign",
    "tasks_create",
    "finance_view",
    "reports_view",
    "analytics",
    "staff_view",
  ],
  operator: [
    "machines_view",
    "inventory_refill",
    "inventory_view",
    "tasks_view",
    "tasks_create",
  ],
  warehouse: ["inventory_full", "inventory_view", "tasks_view"],
  accountant: [
    "finance_full",
    "finance_view",
    "finance_reports",
    "reports_view",
    "analytics",
    "export",
  ],
  viewer: [
    "machines_view",
    "inventory_view",
    "tasks_view",
    "finance_view",
    "reports_view",
    "staff_view",
  ],
};

export const ACTION_ICON: Record<
  string,
  { icon: typeof Users; color: string }
> = {
  create: {
    icon: Plus,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
  },
  edit: { icon: Edit3, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  delete: { icon: Trash2, color: "text-red-600 bg-red-100 dark:bg-red-900/30" },
  login: {
    icon: UserCheck,
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  },
  role_change: {
    icon: Shield,
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  },
};

export const HEADCOUNT_BY_ROLE = [
  { role: "Владелец", count: 1, fill: "#8b5cf6" },
  { role: "Администратор", count: 1, fill: "#ef4444" },
  { role: "Менеджер", count: 1, fill: "#3b82f6" },
  { role: "Оператор", count: 3, fill: "#10b981" },
  { role: "Склад", count: 1, fill: "#f59e0b" },
  { role: "Бухгалтер", count: 1, fill: "#6366f1" },
  { role: "Наблюдатель", count: 0, fill: "#6b7280" },
];

export const HIRING_TIMELINE = [
  { month: "Январь", hired: 1 },
  { month: "Февраль", hired: 1 },
  { month: "Март", hired: 1 },
  { month: "Апрель", hired: 1 },
  { month: "Май", hired: 1 },
  { month: "Июнь", hired: 1 },
  { month: "Июль", hired: 1 },
  { month: "Август", hired: 1 },
  { month: "Сентябрь", hired: 0 },
  { month: "Октябрь", hired: 0 },
  { month: "Ноябрь", hired: 0 },
  { month: "Декабрь", hired: 0 },
];

export const TENURE_DISTRIBUTION = [
  { name: "0-3 месяца", value: 2, fill: "#ef4444" },
  { name: "3-6 месяцев", value: 3, fill: "#f59e0b" },
  { name: "6-12 месяцев", value: 2, fill: "#3b82f6" },
  { name: "12+ месяцев", value: 1, fill: "#10b981" },
];

export const PERFORMANCE_DATA = [
  { name: "Алексей Петров", tasks: 95, rating: 98, timelyCompletion: 92 },
  { name: "Азиз Каримов", tasks: 85, rating: 96, timelyCompletion: 88 },
  { name: "Малика Рахимова", tasks: 82, rating: 94, timelyCompletion: 90 },
  { name: "Дмитрий Козлов", tasks: 88, rating: 90, timelyCompletion: 85 },
  { name: "Нодира Хасанова", tasks: 72, rating: 92, timelyCompletion: 80 },
];

export const RESPONSE_TIME_DATA = [
  { week: "Неделя 1", avgTime: 45 },
  { week: "Неделя 2", avgTime: 38 },
  { week: "Неделя 3", avgTime: 32 },
  { week: "Неделя 4", avgTime: 28 },
];

export const TOP_PERFORMERS = [
  { rank: 1, name: "Дмитрий Козлов", tasks: 312 },
  { rank: 2, name: "Азиз Каримов", tasks: 234 },
  { rank: 3, name: "Малика Рахимова", tasks: 189 },
  { rank: 4, name: "Алексей Петров", tasks: 156 },
  { rank: 5, name: "Сергей Новиков", tasks: 145 },
];

export const SCHEDULE_DATA: Record<string, string[]> = {
  "Алексей Петров": ["day", "day", "day", "day", "day", "", ""],
  "Азиз Каримов": [
    "morning",
    "morning",
    "morning",
    "morning",
    "morning",
    "",
    "",
  ],
  "Малика Рахимова": ["day", "day", "day", "day", "day", "day", ""],
  "Дмитрий Козлов": [
    "evening",
    "evening",
    "evening",
    "evening",
    "evening",
    "",
    "",
  ],
  "Нодира Хасанова": ["day", "day", "day", "", "", "", ""],
  "Елена Сидорова": [
    "morning",
    "morning",
    "morning",
    "morning",
    "morning",
    "morning",
    "morning",
  ],
  "Сергей Новиков": ["evening", "evening", "", "", "", "", ""],
  "Алишер Усманов": ["day", "", "", "", "", "", ""],
};

export const SALARY_DATA = [
  { name: "Алексей Петров", base: 5000000, bonus: 500000, deductions: 200000 },
  { name: "Азиз Каримов", base: 4500000, bonus: 400000, deductions: 180000 },
  { name: "Малика Рахимова", base: 3500000, bonus: 350000, deductions: 140000 },
  { name: "Дмитрий Козлов", base: 2500000, bonus: 250000, deductions: 100000 },
  { name: "Нодира Хасанова", base: 2000000, bonus: 200000, deductions: 80000 },
  { name: "Елена Сидорова", base: 3000000, bonus: 300000, deductions: 120000 },
  { name: "Сергей Новиков", base: 2300000, bonus: 230000, deductions: 92000 },
  { name: "Алишер Усманов", base: 1800000, bonus: 180000, deductions: 72000 },
];

export const SALARY_BY_ROLE = [
  { role: "Владелец", amount: 5000000, fill: "#8b5cf6" },
  { role: "Администратор", amount: 4500000, fill: "#ef4444" },
  { role: "Менеджер", amount: 3500000, fill: "#3b82f6" },
  { role: "Бухгалтер", amount: 3000000, fill: "#6366f1" },
  { role: "Оператор", amount: 2200000, fill: "#10b981" },
  { role: "Склад", amount: 2000000, fill: "#f59e0b" },
];

export const BONUS_DISTRIBUTION = [
  { name: "Премии", value: 2410000, fill: "#f59e0b" },
  { name: "Бонусы производительности", value: 1960000, fill: "#10b981" },
  { name: "Стимулы", value: 980000, fill: "#3b82f6" },
];

export function hasPermForRole(role: string, perm: string): boolean {
  const perms = ROLE_PERMS_MATRIX[role] || [];
  return perms.includes("full_access") || perms.includes(perm);
}

export function getKPIBadgeVariant(
  value: number,
): "success" | "warning" | "destructive" | "default" {
  if (value >= 85) return "success";
  if (value >= 70) return "warning";
  return "destructive";
}

export function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}
