"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api";

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
      const response = await ordersApi.getAll({ limit: limit.toString() });
      return response.data as DbOrder[];
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      const response = await ordersApi.getById(id);
      return response.data as DbOrder;
    },
    enabled: !!id,
  });
}

export function useOrderStats() {
  return useQuery({
    queryKey: ["order-stats"],
    queryFn: async () => {
      const response = await ordersApi.getStats();
      return response.data as OrderStats;
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (order: Omit<DbOrder, "id" | "created_at">) => {
      const response = await ordersApi.create(order);
      return response.data as DbOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
    },
  });
}

/** Input for useUpdateOrder — matches backend PUT /orders/:id/status and PUT /orders/:id/payment */
export type UpdateOrderInput =
  | { id: string; type: "status"; status: DbOrder["status"]; reason?: string }
  | {
      id: string;
      type: "payment";
      paymentStatus:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded";
      paymentMethod?: string;
    };

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateOrderInput) => {
      // Backend has two separate endpoints — route by type
      if (input.type === "status") {
        const response = await ordersApi.updateStatus(input.id, {
          status: input.status,
          ...(input.reason && { reason: input.reason }),
        });
        return response.data as DbOrder;
      }
      // input.type === "payment"
      const response = await ordersApi.updatePayment(input.id, {
        paymentStatus: input.paymentStatus,
        ...(input.paymentMethod && { paymentMethod: input.paymentMethod }),
      });
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
      status,
    }: {
      id: string;
      status: DbOrder["status"];
    }) => {
      const response = await ordersApi.updateStatus(id, { status });
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
      await ordersApi.cancel(id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
    },
  });
}
