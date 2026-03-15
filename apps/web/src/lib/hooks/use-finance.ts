"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export interface DbFinanceTransaction {
  id: string;
  type: "income" | "expense" | "transfer";
  category: string;
  description: string;
  amount: number;
  counterparty_id: string | null;
  counterparty_name: string | null;
  payment_method: string | null;
  machine_id: string | null;
  status: "completed" | "pending" | "cancelled";
  created_at: string;
}

export interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayouts: number;
  taxDue: number;
}

export interface DailyRevenueData {
  date: string;
  revenue: number;
  expenses: number;
}

/**
 * Finance transactions — maps bank deposits from GET /finance/deposits
 * into the DbFinanceTransaction shape the UI expects
 */
export function useFinanceTransactions(limit = 50) {
  return useQuery({
    queryKey: ["finance-transactions", limit],
    queryFn: async () => {
      const response = await api.get("/finance/deposits");
      const deposits: Array<{
        id: string;
        amount: number;
        depositDate: string;
        notes: string | null;
        createdAt: string;
      }> = response.data ?? [];
      return deposits.slice(0, limit).map(
        (d): DbFinanceTransaction => ({
          id: d.id,
          type: "expense",
          category: "bank_deposit",
          description: d.notes ?? "Bank deposit",
          amount: d.amount,
          counterparty_id: null,
          counterparty_name: null,
          payment_method: "bank_transfer",
          machine_id: null,
          status: "completed",
          created_at: d.depositDate ?? d.createdAt,
        }),
      );
    },
  });
}

/**
 * Finance stats — computed from GET /finance/balance
 * balance endpoint returns { received, deposited, balance }
 */
export function useFinanceStats() {
  return useQuery({
    queryKey: ["finance-stats"],
    queryFn: async () => {
      const response = await api.get("/finance/balance");
      const data: { received: number; deposited: number; balance: number } =
        response.data;
      return {
        totalRevenue: data.received,
        totalExpenses: data.deposited,
        netProfit: data.balance,
        pendingPayouts: 0,
        taxDue: 0,
      } satisfies FinanceStats;
    },
  });
}

/**
 * Daily revenue — maps from GET /analytics/daily
 */
export function useDailyRevenue(days = 30) {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return useQuery({
    queryKey: ["daily-revenue", days],
    queryFn: async () => {
      const response = await api.get("/analytics/daily", {
        params: { from, to },
      });
      return response.data;
    },
  });
}

/**
 * Payout requests — no backend endpoint yet, returns empty array
 */
export function usePayoutRequests() {
  return useQuery({
    queryKey: ["payout-requests"],
    queryFn: async () =>
      [] as Array<{
        id: string;
        amount: number;
        status: string;
        createdAt: string;
      }>,
  });
}

/**
 * Create deposit via POST /finance/deposits
 */
export function useCreateFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      transaction: Omit<DbFinanceTransaction, "id" | "created_at">,
    ) => {
      const response = await api.post("/finance/deposits", {
        amount: transaction.amount,
        date: new Date().toISOString(),
        notes: transaction.description,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["daily-revenue"] });
    },
  });
}

/**
 * Update — not supported by current backend (deposits are immutable)
 * Kept for interface compatibility; logs warning and resolves
 */
export function useUpdateFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string;
      updates: Partial<Omit<DbFinanceTransaction, "id" | "created_at">>;
    }) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[useUpdateFinanceTransaction] Update not supported for deposit ${id}`,
        );
      }
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
    },
  });
}

/**
 * Delete deposit via DELETE /finance/deposits/:id
 */
export function useDeleteFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/finance/deposits/${id}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["daily-revenue"] });
    },
  });
}
