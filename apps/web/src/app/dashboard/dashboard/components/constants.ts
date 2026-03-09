import {
  DollarSign,
  Receipt,
  ShoppingCart,
  Users,
  Monitor,
  AlertTriangle,
  ClipboardList,
  Wallet,
  WifiOff,
  Package,
  ShoppingCart as ShoppingCartIcon,
  Truck,
  CheckCircle,
  Wrench,
  Banknote,
  Smartphone,
  CreditCard,
  Building,
  LayoutDashboard,
  TrendingUp,
  Activity,
} from "lucide-react";

export type TabId = "overview" | "sales" | "machines" | "activity";
export type ActivityType =
  | "sale"
  | "refill"
  | "alert"
  | "task"
  | "collection"
  | "maintenance";

export const TAB_IDS: { id: TabId; icon: typeof LayoutDashboard }[] = [
  { id: "overview", icon: LayoutDashboard },
  { id: "sales", icon: TrendingUp },
  { id: "machines", icon: Monitor },
  { id: "activity", icon: Activity },
];

export const KPI_KEYS = [
  "dailyRevenue",
  "avgCheck",
  "orders",
  "activeClients",
  "machinesOnline",
  "criticalStock",
  "taskQueue",
  "collection",
] as const;

export type KpiKey = (typeof KPI_KEYS)[number];

export const KPI_DATA: {
  key: KpiKey;
  value: number | string;
  change: number;
  icon: typeof DollarSign;
  color: string;
  format: "price" | "number" | "raw";
}[] = [
  {
    key: "dailyRevenue",
    value: 4_850_000,
    change: 12.5,
    icon: DollarSign,
    color: "bg-emerald-50 text-emerald-600",
    format: "price",
  },
  {
    key: "avgCheck",
    value: 8_527,
    change: 3.2,
    icon: Receipt,
    color: "bg-blue-50 text-blue-600",
    format: "price",
  },
  {
    key: "orders",
    value: 247,
    change: 8.3,
    icon: ShoppingCart,
    color: "bg-amber-50 text-amber-600",
    format: "number",
  },
  {
    key: "activeClients",
    value: 1_832,
    change: -2.1,
    icon: Users,
    color: "bg-purple-50 text-purple-600",
    format: "number",
  },
  {
    key: "machinesOnline",
    value: "14/16",
    change: 0,
    icon: Monitor,
    color: "bg-cyan-50 text-cyan-600",
    format: "raw",
  },
  {
    key: "criticalStock",
    value: 3,
    change: 0,
    icon: AlertTriangle,
    color: "bg-red-50 text-red-600",
    format: "number",
  },
  {
    key: "taskQueue",
    value: 12,
    change: 5,
    icon: ClipboardList,
    color: "bg-orange-50 text-orange-600",
    format: "number",
  },
  {
    key: "collection",
    value: 3_420_000,
    change: 18.7,
    icon: Wallet,
    color: "bg-green-50 text-green-600",
    format: "price",
  },
];

export const HOURLY_SALES = [
  { hour: "06:00", today: 120_000, yesterday: 95_000 },
  { hour: "08:00", today: 450_000, yesterday: 380_000 },
  { hour: "10:00", today: 820_000, yesterday: 720_000 },
  { hour: "12:00", today: 1_250_000, yesterday: 1_100_000 },
  { hour: "14:00", today: 1_580_000, yesterday: 1_450_000 },
  { hour: "16:00", today: 1_890_000, yesterday: 1_720_000 },
  { hour: "18:00", today: 2_150_000, yesterday: 1_980_000 },
  { hour: "20:00", today: 2_340_000, yesterday: 2_150_000 },
];

export const MACHINE_STATUS = [
  {
    id: "VM-001",
    name: "ТЦ Мега Чиланзар",
    status: "online" as const,
    sales: 234_000,
    orders: 28,
    lastSync: "2 мин",
    cpu: 45,
    temp: 92,
    stock: 78,
  },
  {
    id: "VM-002",
    name: "БЦ Пойтахт",
    status: "online" as const,
    sales: 189_000,
    orders: 22,
    lastSync: "3 мин",
    cpu: 38,
    temp: 90,
    stock: 65,
  },
  {
    id: "VM-003",
    name: "KIUT Главный корпус",
    status: "online" as const,
    sales: 312_000,
    orders: 37,
    lastSync: "1 мин",
    cpu: 52,
    temp: 93,
    stock: 82,
  },
  {
    id: "VM-004",
    name: "KIUT Библиотека",
    status: "warning" as const,
    sales: 98_000,
    orders: 12,
    lastSync: "15 мин",
    cpu: 78,
    temp: 91,
    stock: 15,
  },
  {
    id: "VM-005",
    name: "Метро Чиланзар",
    status: "offline" as const,
    sales: 0,
    orders: 0,
    lastSync: "2 часа",
    cpu: 0,
    temp: 0,
    stock: 45,
  },
  {
    id: "VM-006",
    name: "INHA University",
    status: "online" as const,
    sales: 267_000,
    orders: 31,
    lastSync: "1 мин",
    cpu: 41,
    temp: 91,
    stock: 70,
  },
  {
    id: "VM-007",
    name: "ТЦ Samarqand Darvoza",
    status: "online" as const,
    sales: 345_000,
    orders: 42,
    lastSync: "2 мин",
    cpu: 47,
    temp: 92,
    stock: 88,
  },
  {
    id: "VM-008",
    name: "Кардиология центр",
    status: "warning" as const,
    sales: 156_000,
    orders: 18,
    lastSync: "8 мин",
    cpu: 65,
    temp: 94,
    stock: 22,
  },
  {
    id: "VM-009",
    name: "TTU Политех",
    status: "online" as const,
    sales: 201_000,
    orders: 24,
    lastSync: "2 мин",
    cpu: 39,
    temp: 90,
    stock: 71,
  },
  {
    id: "VM-010",
    name: "MDIST институт",
    status: "online" as const,
    sales: 178_000,
    orders: 21,
    lastSync: "4 мин",
    cpu: 43,
    temp: 91,
    stock: 60,
  },
  {
    id: "VM-011",
    name: "Humo Arena",
    status: "online" as const,
    sales: 412_000,
    orders: 49,
    lastSync: "1 мин",
    cpu: 55,
    temp: 93,
    stock: 75,
  },
  {
    id: "VM-012",
    name: "Tashkent City Mall",
    status: "online" as const,
    sales: 523_000,
    orders: 61,
    lastSync: "1 мин",
    cpu: 60,
    temp: 94,
    stock: 67,
  },
  {
    id: "VM-013",
    name: "IT Park Yashnabad",
    status: "online" as const,
    sales: 289_000,
    orders: 34,
    lastSync: "3 мин",
    cpu: 44,
    temp: 91,
    stock: 80,
  },
  {
    id: "VM-014",
    name: "ТЦ Next Сергели",
    status: "online" as const,
    sales: 198_000,
    orders: 23,
    lastSync: "2 мин",
    cpu: 37,
    temp: 90,
    stock: 73,
  },
  {
    id: "VM-015",
    name: "Бизнес центр Зум",
    status: "warning" as const,
    sales: 134_000,
    orders: 16,
    lastSync: "12 мин",
    cpu: 72,
    temp: 95,
    stock: 18,
  },
  {
    id: "VM-016",
    name: "SOLIQ Управление",
    status: "offline" as const,
    sales: 45_000,
    orders: 5,
    lastSync: "3 часа",
    cpu: 0,
    temp: 0,
    stock: 50,
  },
];

export const QUICK_ACTION_KEYS = [
  "createTask",
  "dailyReport",
  "refill",
  "check",
] as const;

export const QUICK_ACTION_META: Record<
  (typeof QUICK_ACTION_KEYS)[number],
  { icon: string; color: string; textColor: string }
> = {
  createTask: {
    icon: "Plus",
    color: "bg-blue-500 hover:bg-blue-600",
    textColor: "text-blue-500",
  },
  dailyReport: {
    icon: "FileText",
    color: "bg-amber-500 hover:bg-amber-600",
    textColor: "text-amber-500",
  },
  refill: {
    icon: "Truck",
    color: "bg-emerald-500 hover:bg-emerald-600",
    textColor: "text-emerald-500",
  },
  check: {
    icon: "Settings",
    color: "bg-cyan-500 hover:bg-cyan-600",
    textColor: "text-cyan-500",
  },
};

export const SALES_WEEK_DATA = [
  { dayKey: "mon", revenue: 3_200_000, orders: 182 },
  { dayKey: "tue", revenue: 3_750_000, orders: 210 },
  { dayKey: "wed", revenue: 4_100_000, orders: 235 },
  { dayKey: "thu", revenue: 3_900_000, orders: 220 },
  { dayKey: "fri", revenue: 5_200_000, orders: 298 },
  { dayKey: "sat", revenue: 6_100_000, orders: 340 },
  { dayKey: "sun", revenue: 4_850_000, orders: 247 },
];

export const CATEGORY_KEYS = ["coffee", "tea", "cocoa", "cold"] as const;

export const CATEGORY_DATA: {
  key: (typeof CATEGORY_KEYS)[number];
  value: number;
  color: string;
}[] = [
  { key: "coffee", value: 62, color: "#5D4037" },
  { key: "tea", value: 18, color: "#D4A574" },
  { key: "cocoa", value: 12, color: "#B8834A" },
  { key: "cold", value: 8, color: "#7CB69D" },
];

export const PAYMENT_METHODS = [
  {
    methodKey: "cash",
    amount: 1_650_000,
    percent: 34,
    icon: Banknote,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    methodKey: "payme",
    method: "Payme",
    amount: 1_215_000,
    percent: 25,
    icon: Smartphone,
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    methodKey: "click",
    method: "Click",
    amount: 970_000,
    percent: 20,
    icon: CreditCard,
    color: "bg-blue-100 text-blue-700",
  },
  {
    methodKey: "uzum",
    method: "Uzum",
    amount: 630_000,
    percent: 13,
    icon: Building,
    color: "bg-purple-100 text-purple-700",
  },
  {
    methodKey: "humo_uzcard",
    method: "HUMO/UZCARD",
    amount: 385_000,
    percent: 8,
    icon: CreditCard,
    color: "bg-sky-100 text-sky-700",
  },
];

export const TOP_PRODUCTS = [
  { name: "Капучино", sales: 89, revenue: 2_670_000, maxSales: 89 },
  { name: "Латте", sales: 72, revenue: 2_520_000, maxSales: 89 },
  { name: "Американо", sales: 64, revenue: 1_280_000, maxSales: 89 },
  { name: "Горячий Шоколад", sales: 38, revenue: 1_140_000, maxSales: 89 },
  { name: "Мокко", sales: 31, revenue: 1_085_000, maxSales: 89 },
];

export const ALERTS = [
  {
    id: "1",
    type: "error" as const,
    title: "SOLIQ-02 офлайн",
    message: "Нет связи > 3 часов. Последний пинг: 11:23",
    machine: "VM-016",
    createdAt: new Date(Date.now() - 180 * 60_000).toISOString(),
  },
  {
    id: "2",
    type: "error" as const,
    title: "Метро Чиланзар офлайн",
    message: "Нет связи > 2 часов. Платёжный терминал",
    machine: "VM-005",
    createdAt: new Date(Date.now() - 120 * 60_000).toISOString(),
  },
  {
    id: "3",
    type: "warning" as const,
    title: "Низкий запас: KIUT Библиотека",
    message: "Молоко осталось на ~15 порций",
    machine: "VM-004",
    createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
  {
    id: "4",
    type: "warning" as const,
    title: "Низкий запас: БЦ Зум",
    message: "Кофе зерно на ~18 порций",
    machine: "VM-015",
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
  {
    id: "5",
    type: "warning" as const,
    title: "Высокая температура: Кардиология",
    message: "Температура 95°C (норма ≤93°C)",
    machine: "VM-008",
    createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
  },
  {
    id: "6",
    type: "info" as const,
    title: "Плановое ТО завтра",
    message: "INHA-01 и TTU-01 — регламент",
    machine: "VM-006, VM-009",
    createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
  },
];

export const RECENT_ORDERS = [
  {
    id: "ORD-1247",
    product: "Капучино",
    machine: "VM-003",
    total: 30_000,
    time: "2 мин назад",
  },
  {
    id: "ORD-1246",
    product: "Латте + Круассан",
    machine: "VM-006",
    total: 50_000,
    time: "8 мин назад",
  },
  {
    id: "ORD-1245",
    product: "Американо",
    machine: "VM-009",
    total: 20_000,
    time: "12 мин назад",
  },
  {
    id: "ORD-1244",
    product: "Мокко",
    machine: "VM-012",
    total: 35_000,
    time: "18 мин назад",
  },
  {
    id: "ORD-1243",
    product: "Горячий Шоколад",
    machine: "VM-003",
    total: 30_000,
    time: "25 мин назад",
  },
];

export const ACTIVITY_CONFIG: Record<
  ActivityType,
  { icon: typeof ShoppingCartIcon; color: string; bg: string }
> = {
  sale: { icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50" },
  refill: { icon: Truck, color: "text-blue-600", bg: "bg-blue-50" },
  alert: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  task: { icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-50" },
  collection: { icon: Wallet, color: "text-emerald-700", bg: "bg-emerald-50" },
  maintenance: { icon: Wrench, color: "text-cyan-600", bg: "bg-cyan-50" },
};

export const ACTIVITY_TYPE_I18N_MAP: Record<ActivityType, string> = {
  sale: "filterSales",
  refill: "filterRefills",
  alert: "filterAlerts",
  task: "filterTasks",
  collection: "filterCollection",
  maintenance: "filterMaintenance",
};

export const ACTIVITY_FEED: {
  id: number;
  type: ActivityType;
  text: string;
  machine: string;
  detail: string;
  time: string;
}[] = [
  {
    id: 1,
    type: "sale",
    text: "Продажа: Капучино",
    machine: "VM-003",
    detail: "30 000 UZS",
    time: "2 мин назад",
  },
  {
    id: 2,
    type: "refill",
    text: "Загрузка завершена",
    machine: "VM-008",
    detail: "Оператор: Алишер",
    time: "15 мин назад",
  },
  {
    id: 3,
    type: "sale",
    text: "Продажа: Латте + Круассан",
    machine: "VM-006",
    detail: "50 000 UZS",
    time: "18 мин назад",
  },
  {
    id: 4,
    type: "alert",
    text: "Автомат перешёл в offline",
    machine: "VM-005",
    detail: "Нет связи > 2 часов",
    time: "25 мин назад",
  },
  {
    id: 5,
    type: "task",
    text: "Задача выполнена: Уборка",
    machine: "VM-007",
    detail: "Бахтиёр",
    time: "32 мин назад",
  },
  {
    id: 6,
    type: "collection",
    text: "Инкассация",
    machine: "VM-011",
    detail: "850 000 UZS",
    time: "1 час назад",
  },
  {
    id: 7,
    type: "sale",
    text: "Продажа: Эспрессо ×2",
    machine: "VM-012",
    detail: "40 000 UZS",
    time: "1 час назад",
  },
  {
    id: 8,
    type: "maintenance",
    text: "Техобслуживание начато",
    machine: "VM-009",
    detail: "Техник: Сардор",
    time: "2 часа назад",
  },
  {
    id: 9,
    type: "sale",
    text: "Продажа: Горячий Шоколад",
    machine: "VM-003",
    detail: "30 000 UZS",
    time: "2 часа назад",
  },
  {
    id: 10,
    type: "collection",
    text: "Инкассация",
    machine: "VM-007",
    detail: "720 000 UZS",
    time: "3 часа назад",
  },
  {
    id: 11,
    type: "refill",
    text: "Загрузка: молоко, зёрна",
    machine: "VM-004",
    detail: "Оператор: Дильшод",
    time: "3 часа назад",
  },
  {
    id: 12,
    type: "alert",
    text: "Низкий запас молока",
    machine: "VM-015",
    detail: "Осталось ~18 порций",
    time: "4 часа назад",
  },
];

export const REVENUE_TREND = [
  { dayKey: "mon", revenue: 3_200_000, orders: 182 },
  { dayKey: "tue", revenue: 3_750_000, orders: 210 },
  { dayKey: "wed", revenue: 4_100_000, orders: 235 },
  { dayKey: "thu", revenue: 3_900_000, orders: 220 },
  { dayKey: "fri", revenue: 5_200_000, orders: 298 },
  { dayKey: "sat", revenue: 6_100_000, orders: 340 },
  { dayKey: "sun", revenue: 4_850_000, orders: 247 },
];

export const ALERT_STYLES = {
  error: {
    icon: WifiOff,
    bg: "bg-red-50",
    border: "border-l-red-500",
    text: "text-red-700",
  },
  warning: {
    icon: Package,
    bg: "bg-amber-50",
    border: "border-l-amber-500",
    text: "text-amber-700",
  },
  info: {
    icon: AlertTriangle,
    bg: "bg-blue-50",
    border: "border-l-blue-500",
    text: "text-blue-700",
  },
} as const;

export const MACHINE_STATUS_KEYS = ["online", "warning", "offline"] as const;

export const MACHINE_STATUS_META: Record<
  string,
  { dot: string; badge: "success" | "warning" | "destructive" }
> = {
  online: { dot: "bg-emerald-500", badge: "success" },
  warning: { dot: "bg-amber-500", badge: "warning" },
  offline: { dot: "bg-red-500", badge: "destructive" },
};

export const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #EFEBE9",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    fontSize: 13,
  },
};

export function fmtShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} млрд`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
