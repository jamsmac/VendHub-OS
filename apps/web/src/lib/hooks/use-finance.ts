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

export function useFinanceTransactions(limit = 50) {
  return useQuery({
    queryKey: ["finance-transactions", limit],
    queryFn: async () => {
      const response = await api.get("/cash-finance/transactions", {
        params: { limit },
      });
      return response.data;
    },
  });
}

export function useFinanceStats() {
  return useQuery({
    queryKey: ["finance-stats"],
    queryFn: async () => {
      const response = await api.get("/cash-finance/stats");
      return response.data;
    },
  });
}

export function useDailyRevenue(days = 30) {
  return useQuery({
    queryKey: ["daily-revenue", days],
    queryFn: async () => {
      const response = await api.get("/cash-finance/daily-revenue", {
        params: { days },
      });
      return response.data;
    },
  });
}

export function usePayoutRequests() {
  return useQuery({
    queryKey: ["payout-requests"],
    queryFn: async () => {
      const response = await api.get("/cash-finance/payout-requests");
      return response.data;
    },
  });
}

/**
 * Mutation: Create a new finance transaction
 * Invalidates finance-transactions, finance-stats, and daily-revenue queries on success
 */
export function useCreateFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      transaction: Omit<DbFinanceTransaction, "id" | "created_at">,
    ) => {
      const response = await api.post(
        "/cash-finance/transactions",
        transaction,
      );
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
 * Mutation: Update a finance transaction
 * Accepts { id, updates } object
 */
export function useUpdateFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<DbFinanceTransaction, "id" | "created_at">>;
    }) => {
      const response = await api.patch(
        `/cash-finance/transactions/${id}`,
        updates,
      );
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
 * Mutation: Delete a finance transaction
 */
export function useDeleteFinanceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cash-finance/transactions/${id}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-stats"] });
      queryClient.invalidateQueries({ queryKey: ["daily-revenue"] });
    },
  });
}
