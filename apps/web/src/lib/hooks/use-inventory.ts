"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi, warehousesApi } from "../api";

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
      const response = await warehousesApi.getAll();
      return response.data as DbWarehouse[];
    },
  });
}

export function useAllInventory() {
  return useQuery({
    queryKey: ["all-inventory"],
    queryFn: async () => {
      const response = await inventoryApi.getWarehouse();
      return response.data as DbInventoryItem[];
    },
  });
}

export function useInventoryByWarehouse(warehouseId: string) {
  return useQuery({
    queryKey: ["inventory", warehouseId],
    queryFn: async () => {
      const response = await warehousesApi.getStock(warehouseId);
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
      const response = await warehousesApi.getAll();
      const lowStock = await inventoryApi.getLowStock();
      const warehouses = response.data as DbWarehouse[];
      const lowStockItems = Array.isArray(lowStock.data) ? lowStock.data : [];
      return {
        totalWarehouses: warehouses.length,
        totalItems: 0,
        lowStockItems: lowStockItems.length,
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
    mutationFn: async (data: Omit<DbWarehouse, "id" | "created_at">) => {
      const response = await warehousesApi.create(data);
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
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<DbWarehouse, "id" | "created_at">>;
    }) => {
      const response = await warehousesApi.update(id, updates);
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
    mutationFn: async (id: string) => {
      await warehousesApi.delete(id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<DbInventoryItem, "id" | "updated_at">) => {
      // Stock is added via warehouse movements (receipt type)
      const response = await warehousesApi.createMovement(item.warehouse_id, {
        productId: item.product_id,
        quantity: item.current_qty,
        type: "receipt",
        cost: item.cost_per_unit * item.current_qty,
      });
      return response.data;
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
      warehouseId,
      productId,
      quantity,
      cost,
    }: {
      warehouseId: string;
      productId: string;
      quantity: number;
      cost?: number;
    }) => {
      // Stock adjustments are done via warehouse movements (adjustment type)
      // warehouseId is required — it's the warehouse UUID, not the inventory item ID
      const response = await warehousesApi.createMovement(warehouseId, {
        productId,
        quantity,
        type: "adjustment",
        ...(cost != null && { cost }),
      });
      return response.data;
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
      id,
      status,
    }: {
      id: string;
      status: DbInventoryMovement["status"];
    }) => {
      if (status === "completed") {
        await warehousesApi.completeMovement(id);
      } else if (status === "cancelled") {
        await warehousesApi.cancelMovement(id);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    },
  });
}
