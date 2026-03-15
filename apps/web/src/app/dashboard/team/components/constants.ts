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
    label: "Owner",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Crown,
    description: "Full access and system ownership",
    isSystem: true,
  },
  admin: {
    label: "Administrator",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    icon: Shield,
    description: "Full access to all features",
    isSystem: true,
  },
  manager: {
    label: "Manager",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Briefcase,
    description: "Operations and personnel management",
    isSystem: true,
  },
  operator: {
    label: "Operator",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: UserCheck,
    description: "Machine service and refilling",
    isSystem: false,
  },
  warehouse: {
    label: "Warehouse",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Layers,
    description: "Warehouse and stock management",
    isSystem: false,
  },
  accountant: {
    label: "Accountant",
    color:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    icon: BarChart3,
    description: "Finance and reporting",
    isSystem: false,
  },
  viewer: {
    label: "Viewer",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: Eye,
    description: "View-only access",
    isSystem: false,
  },
};

export const STATUS_META: Record<
  EmployeeStatus,
  { label: string; color: string; dot: string }
> = {
  active: {
    label: "Active",
    color: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  away: { label: "Away", color: "text-amber-600", dot: "bg-amber-500" },
  inactive: { label: "Inactive", color: "text-gray-500", dot: "bg-gray-400" },
  suspended: {
    label: "Suspended",
    color: "text-red-600",
    dot: "bg-red-500",
  },
  invited: { label: "Invited", color: "text-blue-600", dot: "bg-blue-500" },
};

export const DEPARTMENTS = [
  {
    id: "management",
    name: "Management",
    icon: Crown,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    id: "operations",
    name: "Operations",
    icon: Zap,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    id: "service",
    name: "Service",
    icon: Settings,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "finance",
    name: "Finance",
    icon: Shield,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: BarChart3,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
  },
];

export const ZONES = [
  "Mirzo Ulugbek",
  "Yunusabad",
  "Chilanzar",
  "Yakkasaray",
  "Sirdaryo",
  "Almazar",
  "Shaykhantakhur",
  "Tashkent",
  "Bektemir",
];

export const SHIFT_TYPES = [
  {
    id: "morning",
    name: "Morning",
    time: "06:00-14:00",
    color: "bg-amber-100 text-amber-800",
  },
  {
    id: "day",
    name: "Day",
    time: "10:00-18:00",
    color: "bg-blue-100 text-blue-800",
  },
  {
    id: "evening",
    name: "Evening",
    time: "14:00-22:00",
    color: "bg-purple-100 text-purple-800",
  },
];

export const PERMISSION_CATEGORIES = [
  {
    id: "machines",
    name: "Machines",
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
    name: "Inventory",
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
    name: "Tasks",
    icon: Target,
    perms: ["tasks_view", "tasks_create", "tasks_assign", "tasks_manage"],
  },
  {
    id: "finance",
    name: "Finance",
    icon: Shield,
    perms: ["finance_view", "finance_reports", "collections", "finance_full"],
  },
  {
    id: "reports",
    name: "Reports",
    icon: FileText,
    perms: ["reports_view", "analytics", "export", "reports_create"],
  },
  {
    id: "team",
    name: "Team",
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
  { role: "Owner", count: 1, fill: "#8b5cf6" },
  { role: "Administrator", count: 1, fill: "#ef4444" },
  { role: "Manager", count: 1, fill: "#3b82f6" },
  { role: "Operator", count: 3, fill: "#10b981" },
  { role: "Warehouse", count: 1, fill: "#f59e0b" },
  { role: "Accountant", count: 1, fill: "#6366f1" },
  { role: "Viewer", count: 0, fill: "#6b7280" },
];

export const HIRING_TIMELINE = [
  { month: "January", hired: 1 },
  { month: "February", hired: 1 },
  { month: "March", hired: 1 },
  { month: "April", hired: 1 },
  { month: "May", hired: 1 },
  { month: "June", hired: 1 },
  { month: "July", hired: 1 },
  { month: "August", hired: 1 },
  { month: "September", hired: 0 },
  { month: "October", hired: 0 },
  { month: "November", hired: 0 },
  { month: "December", hired: 0 },
];

export const TENURE_DISTRIBUTION = [
  { name: "0-3 months", value: 2, fill: "#ef4444" },
  { name: "3-6 months", value: 3, fill: "#f59e0b" },
  { name: "6-12 months", value: 2, fill: "#3b82f6" },
  { name: "12+ months", value: 1, fill: "#10b981" },
];

export const PERFORMANCE_DATA = [
  { name: "Alexey Petrov", tasks: 95, rating: 98, timelyCompletion: 92 },
  { name: "Aziz Karimov", tasks: 85, rating: 96, timelyCompletion: 88 },
  { name: "Malika Rakhimova", tasks: 82, rating: 94, timelyCompletion: 90 },
  { name: "Dmitry Kozlov", tasks: 88, rating: 90, timelyCompletion: 85 },
  { name: "Nodira Khasanova", tasks: 72, rating: 92, timelyCompletion: 80 },
];

export const RESPONSE_TIME_DATA = [
  { week: "Week 1", avgTime: 45 },
  { week: "Week 2", avgTime: 38 },
  { week: "Week 3", avgTime: 32 },
  { week: "Week 4", avgTime: 28 },
];

export const TOP_PERFORMERS = [
  { rank: 1, name: "Dmitry Kozlov", tasks: 312 },
  { rank: 2, name: "Aziz Karimov", tasks: 234 },
  { rank: 3, name: "Malika Rakhimova", tasks: 189 },
  { rank: 4, name: "Alexey Petrov", tasks: 156 },
  { rank: 5, name: "Sergey Novikov", tasks: 145 },
];

export const SCHEDULE_DATA: Record<string, string[]> = {
  "Alexey Petrov": ["day", "day", "day", "day", "day", "", ""],
  "Aziz Karimov": [
    "morning",
    "morning",
    "morning",
    "morning",
    "morning",
    "",
    "",
  ],
  "Malika Rakhimova": ["day", "day", "day", "day", "day", "day", ""],
  "Dmitry Kozlov": [
    "evening",
    "evening",
    "evening",
    "evening",
    "evening",
    "",
    "",
  ],
  "Nodira Khasanova": ["day", "day", "day", "", "", "", ""],
  "Elena Sidorova": [
    "morning",
    "morning",
    "morning",
    "morning",
    "morning",
    "morning",
    "morning",
  ],
  "Sergey Novikov": ["evening", "evening", "", "", "", "", ""],
  "Alisher Usmanov": ["day", "", "", "", "", "", ""],
};

export const SALARY_DATA = [
  { name: "Alexey Petrov", base: 5000000, bonus: 500000, deductions: 200000 },
  { name: "Aziz Karimov", base: 4500000, bonus: 400000, deductions: 180000 },
  {
    name: "Malika Rakhimova",
    base: 3500000,
    bonus: 350000,
    deductions: 140000,
  },
  { name: "Dmitry Kozlov", base: 2500000, bonus: 250000, deductions: 100000 },
  { name: "Nodira Khasanova", base: 2000000, bonus: 200000, deductions: 80000 },
  { name: "Elena Sidorova", base: 3000000, bonus: 300000, deductions: 120000 },
  { name: "Sergey Novikov", base: 2300000, bonus: 230000, deductions: 92000 },
  { name: "Alisher Usmanov", base: 1800000, bonus: 180000, deductions: 72000 },
];

export const SALARY_BY_ROLE = [
  { role: "Owner", amount: 5000000, fill: "#8b5cf6" },
  { role: "Administrator", amount: 4500000, fill: "#ef4444" },
  { role: "Manager", amount: 3500000, fill: "#3b82f6" },
  { role: "Accountant", amount: 3000000, fill: "#6366f1" },
  { role: "Operator", amount: 2200000, fill: "#10b981" },
  { role: "Warehouse", amount: 2000000, fill: "#f59e0b" },
];

export const BONUS_DISTRIBUTION = [
  { name: "Premiums", value: 2410000, fill: "#f59e0b" },
  { name: "Performance bonuses", value: 1960000, fill: "#10b981" },
  { name: "Incentives", value: 980000, fill: "#3b82f6" },
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
  return n;
}
