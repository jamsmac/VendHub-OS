"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export interface DbPromotion {
  id: string;
  title: string;
  description: string;
  badge?: string;
  promo_code?: string;
  gradient?: string;
  valid_until?: string;
  sort_order?: number;
  type: "discount" | "cashback" | "gift" | "bundle" | "happy_hour";
  discount_value: number;
  discount_type: "percent" | "fixed";
  start_date: string;
  end_date: string;
  is_active: boolean;
  usage_count: number;
  max_usage: number | null;
  target_audience: string | null;
  conditions?: Record<string, unknown>;
  created_by?: string;
  created_at: string;
}

export interface PromotionStats {
  totalActive: number;
  totalUsage: number;
  revenueImpact: number;
  topPromotion: string | null;
}

export function usePromotions() {
  return useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const response = await api.get("/promo-codes");
      return (response.data.data || []) as DbPromotion[];
    },
  });
}

export function usePromotion(id: string) {
  return useQuery({
    queryKey: ["promotions", id],
    queryFn: async () => {
      const response = await api.get(`/promo-codes/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePromotionStats() {
  return useQuery({
    queryKey: ["promotion-stats"],
    queryFn: async () => {
      const response = await api.get("/promo-codes/stats");
      return response.data;
    },
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      promotion: Omit<DbPromotion, "id" | "created_at" | "usage_count">,
    ) => {
      const response = await api.post("/promo-codes", {
        ...promotion,
        usage_count: 0,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-stats"] });
    },
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<DbPromotion, "id" | "created_at">>;
    }) => {
      const response = await api.put(`/promo-codes/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-stats"] });
    },
  });
}

export function useTogglePromotionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.put(`/promo-codes/${id}`, {
        is_active: isActive,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-stats"] });
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/promo-codes/${id}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-stats"] });
    },
  });
}
