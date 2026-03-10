import {
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Banknote,
  Smartphone,
  CreditCard,
  Building,
  ArrowLeftRight,
  CircleDollarSign,
  PieChart,
  TrendingUp,
  FileText,
  Receipt,
  Scale,
  Wallet,
  BarChart3,
} from "lucide-react";
import { StatusKey, PaymentMethod, Tab } from "./types";

export const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  completed: {
    label: "Проведён",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle,
  },
  pending: {
    label: "Ожидает",
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  failed: {
    label: "Ошибка",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
  },
  paid: {
    label: "Оплачено",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle,
  },
  overdue: {
    label: "Просрочено",
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
  matched: {
    label: "Сверено",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle,
  },
  discrepancy: {
    label: "Расхождение",
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
};

export const PAYMENT_METHODS: Record<string, PaymentMethod> = {
  cash: { label: "Наличные", icon: Banknote, color: "bg-emerald-500" },
  payme: { label: "Payme", icon: Smartphone, color: "bg-cyan-500" },
  click: { label: "Click", icon: CreditCard, color: "bg-blue-500" },
  uzum: { label: "Uzum", icon: Building, color: "bg-purple-500" },
  humo: { label: "HUMO", icon: CreditCard, color: "bg-sky-500" },
  uzcard: { label: "UZCARD", icon: CreditCard, color: "bg-blue-600" },
  transfer: { label: "Перевод", icon: ArrowLeftRight, color: "bg-amber-500" },
  bonus: { label: "Бонусы", icon: CircleDollarSign, color: "bg-purple-600" },
};

export const tabs: Tab[] = [
  { id: "overview", label: "Обзор", icon: PieChart },
  { id: "pnl", label: "P&L", icon: TrendingUp },
  { id: "cashflow", label: "Денежный поток", icon: ArrowLeftRight },
  { id: "transactions", label: "Транзакции", icon: ArrowLeftRight },
  { id: "invoices", label: "Счета", icon: FileText },
  { id: "payments", label: "Платежи", icon: CreditCard },
  { id: "reconciliation", label: "Сверка", icon: Scale },
  { id: "fiscalization", label: "Фискализация", icon: Receipt },
  { id: "budget", label: "Бюджет", icon: Wallet },
  { id: "reports", label: "Отчёты", icon: BarChart3 },
];

export const dateRanges = ["Сегодня", "Неделя", "Месяц", "Квартал", "Год"];

export { formatNumber as fmt } from "@/lib/utils";

export const fmtShort = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} млрд`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};
