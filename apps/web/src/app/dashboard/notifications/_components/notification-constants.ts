import React from "react";
import {
  Bell,
  ClipboardList,
  Package,
  CreditCard,
  AlertTriangle,
  Wrench,
} from "lucide-react";

// ─── Constants / Mappings ─────────────────────────────────────

export const typeIcons: Record<string, React.ReactNode> = {
  system: React.createElement(Bell, { className: "w-4 h-4" }),
  task: React.createElement(ClipboardList, { className: "w-4 h-4" }),
  inventory: React.createElement(Package, { className: "w-4 h-4" }),
  payment: React.createElement(CreditCard, { className: "w-4 h-4" }),
  alert: React.createElement(AlertTriangle, { className: "w-4 h-4" }),
  maintenance: React.createElement(Wrench, { className: "w-4 h-4" }),
};

export const typeColors: Record<string, string> = {
  system: "bg-blue-500/10 text-blue-500",
  task: "bg-violet-500/10 text-violet-500",
  inventory: "bg-orange-500/10 text-orange-500",
  payment: "bg-emerald-500/10 text-emerald-500",
  alert: "bg-red-500/10 text-red-500",
  maintenance: "bg-amber-500/10 text-amber-500",
};

export const channelColors: Record<string, string> = {
  push: "bg-blue-500/10 text-blue-600",
  email: "bg-green-500/10 text-green-600",
  sms: "bg-purple-500/10 text-purple-600",
  telegram: "bg-sky-500/10 text-sky-600",
  in_app: "bg-muted text-muted-foreground",
};

export const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-amber-500/10 text-amber-500",
  low: "bg-green-500/10 text-green-500",
};

export const campaignStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/10 text-blue-500",
  sent: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
};

export const typeKeys = [
  "system",
  "task",
  "inventory",
  "payment",
  "alert",
  "maintenance",
] as const;

export const eventKeys = [
  "machine.offline",
  "machine.error",
  "inventory.low",
  "inventory.empty",
  "task.created",
  "task.assigned",
  "task.completed",
  "task.overdue",
  "payment.received",
  "payment.failed",
  "maintenance.due",
  "alert.critical",
] as const;

export const recipientKeys = [
  "all_admins",
  "all_managers",
  "all_operators",
  "machine_owner",
  "assigned_operator",
  "warehouse_staff",
  "accountants",
] as const;

export const channelKeys = [
  "push",
  "email",
  "sms",
  "telegram",
  "in_app",
] as const;
