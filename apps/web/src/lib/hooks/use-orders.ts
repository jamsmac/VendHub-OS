"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi } from "../api";

export interface DbOrder {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  machine_id: string;
  machine_name: string;
  items: OrderItemRow[];
  total: number;
  status: "new" | "processing" | "completed" | "cancelled";
  payment_method: string;
  created_at: string;
}

export interface OrderItemRow {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface OrderStats {
  total: number;
  completed: number;
  cancelled: number;
  revenue: number;
  avgOrderValue: number;
}

export function useOrders(limit = 50) {
  return useQuery({
    queryKey: ["orders", limit],
    queryFn: async () => {
      const response = await tripsApi.getAll({ limit: limit.toString() });
      return response.data as DbOrder[];
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      const response = await tripsApi.getById(id);
      return response.data as DbOrder;
    },
    enabled: !!id,
  });
}

export function useOrderStats() {
  return useQuery({
    queryKey: ["order-stats"],
    queryFn: async () => {
      const response = await tripsApi.getAll();
      const orders = response.data as DbOrder[];

      if (!orders || orders.length === 0) {
        return {
          total: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
          avgOrderValue: 0,
        };
      }

      const total = orders.length;
      const completed = orders.filter((o) => o.status === "completed").length;
      const cancelled = orders.filter((o) => o.status === "cancelled").length;
      const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
      const avgOrderValue = revenue / total;

      return {
        total,
        completed,
        cancelled,
        revenue,
        avgOrderValue,
      };
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (order: Omit<DbOrder, "id" | "created_at">) => {
      const response = await tripsApi.start(order);
      return response.data as DbOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      _updates,
    }: {
      id: string;
      _updates: Partial<Omit<DbOrder, "id" | "created_at">>;
    }) => {
      const response = await tripsApi.getById(id);
      return response.data as DbOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      _status,
    }: {
      id: string;
      _status: DbOrder["status"];
    }) => {
      const response = await tripsApi.getById(id);
      return response.data as DbOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await tripsApi.cancel(id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
    },
  });
}
