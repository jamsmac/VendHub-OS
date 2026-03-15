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
} from "lucide-react";
import { StatusKey, PaymentMethod } from "./types";

export const STATUS_CONFIG: Record<
  StatusKey,
  {
    /** i18n key under the "finance" namespace (e.g. t(cfg.label)) */
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  completed: {
    label: "statusCompleted",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle,
  },
  pending: {
    label: "statusPending",
    color: "bg-amber-100 text-amber-800",
    icon: Clock,
  },
  failed: {
    label: "statusFailed",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
  },
  paid: {
    label: "statusPaid",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle,
  },
  overdue: {
    label: "statusOverdue",
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
  matched: {
    label: "statusMatched",
    color: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle,
  },
  discrepancy: {
    label: "statusDiscrepancy",
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
};

/** Brand names stay as-is; generic methods use i18n keys (finance namespace). */
export const PAYMENT_METHODS: Record<string, PaymentMethod> = {
  cash: { label: "payCash", icon: Banknote, color: "bg-emerald-500" },
  payme: { label: "Payme", icon: Smartphone, color: "bg-cyan-500" },
  click: { label: "Click", icon: CreditCard, color: "bg-blue-500" },
  uzum: { label: "Uzum", icon: Building, color: "bg-purple-500" },
  humo: { label: "HUMO", icon: CreditCard, color: "bg-sky-500" },
  uzcard: { label: "UZCARD", icon: CreditCard, color: "bg-blue-600" },
  transfer: {
    label: "payTransfer",
    icon: ArrowLeftRight,
    color: "bg-amber-500",
  },
  bonus: { label: "payBonus", icon: CircleDollarSign, color: "bg-purple-600" },
};

// tabs and dateRanges are defined in page.tsx using useTranslations("finance")

export { formatNumber as fmt } from "@/lib/utils";

export const fmtShort = (n: number, billionAbbr = "B"): string => {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1)} ${billionAbbr}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};
