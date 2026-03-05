import { LucideIcon } from "lucide-react";

export type StatusKey =
  | "completed"
  | "pending"
  | "failed"
  | "paid"
  | "overdue"
  | "matched"
  | "discrepancy";
export type TabId =
  | "overview"
  | "pnl"
  | "cashflow"
  | "transactions"
  | "invoices"
  | "payments"
  | "reconciliation"
  | "fiscalization"
  | "budget"
  | "reports";
export type TransactionType = "income" | "expense" | "transfer";

export interface StatusConfig {
  label: string;
  color: string;
  icon: typeof import("lucide-react").AlertCircle;
}

export interface PaymentMethod {
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  payment: string;
  status: StatusKey;
  ref: string;
  collector?: string;
}

export interface Invoice {
  id: string;
  date: string;
  dueDate: string;
  counterparty: string;
  type: "incoming" | "outgoing";
  amount: number;
  status: StatusKey;
  items: number;
  description: string;
}

export interface PaymentSystem {
  id: string;
  name: string;
  balance: number;
  pending: number;
  todayVolume: number;
  txCount: number;
  status: "active" | "inactive";
}

export interface ReconciliationItem {
  id: number;
  source: string;
  date: string;
  systemAmount: number;
  actualAmount: number;
  status: StatusKey;
  difference: number;
}

export interface BudgetItem {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  utilization: number;
}

export interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}
