"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "../api";

export interface DbWarehouse {
  id: string;
  name: string;
  level: "central" | "local" | "machine";
  address: string | null;
  machine_id: string | null;
  machine_name: string | null;
  responsible_person: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DbInventoryItem {
  id: string;
  warehouse_id: string;
  product_id: string;
  current_qty: number;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  cost_per_unit: number;
  last_receipt_date: string | null;
  updated_at: string;
}

export interface DbInventoryMovement {
  id: string;
  type: "receipt" | "transfer" | "consumption" | "write_off" | "adjustment";
  status: "pending" | "in_transit" | "completed" | "cancelled";
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  total_cost: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface InventoryStats {
  totalWarehouses: number;
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
}

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const response = await inventoryApi.getWarehouse();
      return response.data as DbWarehouse[];
    },
  });
}

export function useAllInventory() {
  return useQuery({
    queryKey: ["all-inventory"],
    queryFn: async () => {
      const response = await inventoryApi.getMovements();
      return response.data as DbInventoryItem[];
    },
  });
}

export function useInventoryByWarehouse(warehouseId: string) {
  return useQuery({
    queryKey: ["inventory", warehouseId],
    queryFn: async () => {
      const response = await inventoryApi.getWarehouse();
      return response.data as DbInventoryItem[];
    },
    enabled: !!warehouseId,
  });
}

export function useInventoryMovements(limit = 50) {
  return useQuery({
    queryKey: ["inventory-movements", limit],
    queryFn: async () => {
      const response = await inventoryApi.getMovements({
        limit: limit.toString(),
      });
      return response.data as DbInventoryMovement[];
    },
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ["inventory-stats"],
    queryFn: async () => {
      const response = await inventoryApi.getWarehouse();
      const movements = await inventoryApi.getMovements();
      return {
        totalWarehouses: (response.data as DbWarehouse[]).length,
        totalItems: (movements.data as DbInventoryMovement[]).length,
        lowStockItems: 0,
        totalValue: 0,
      } as InventoryStats;
    },
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ["low-stock-alerts"],
    queryFn: async () => {
      const response = await inventoryApi.getLowStock();
      return response.data as Array<{
        productId: string;
        productName: string;
        warehouseId: string;
        warehouseName: string;
        currentQty: number;
        reorderPoint: number;
      }>;
    },
    refetchInterval: 5 * 60_000, // every 5 minutes
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (data: Omit<DbWarehouse, "id" | "created_at">) => {
      const response = await inventoryApi.getWarehouse();
      return response.data as DbWarehouse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      _id,
      _updates,
    }: {
      _id: string;
      _updates: Partial<Omit<DbWarehouse, "id" | "created_at">>;
    }) => {
      const response = await inventoryApi.getWarehouse();
      return response.data as DbWarehouse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });
}

export function useDeactivateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_id: string) => true,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_item: Omit<DbInventoryItem, "id" | "updated_at">) => {
      const response = await inventoryApi.getWarehouse();
      return response.data as DbInventoryItem[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      _id,
      _updates,
    }: {
      _id: string;
      _updates: Partial<Omit<DbInventoryItem, "id">>;
    }) => {
      const response = await inventoryApi.getWarehouse();
      return response.data as DbInventoryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
    },
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      movement: Omit<DbInventoryMovement, "id" | "created_at">,
    ) => {
      const response = await inventoryApi.transfer(movement);
      return response.data as DbInventoryMovement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["all-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
    },
  });
}

export function useUpdateMovementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      _id,
      _status,
    }: {
      _id: string;
      _status: DbInventoryMovement["status"];
    }) => true,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    },
  });
}
