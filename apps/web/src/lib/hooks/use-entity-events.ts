/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { entityEventsApi, batchMovementsApi } from "../api";

// ============================================================================
// Entity Events Hooks
// ============================================================================

export function useEntityTimeline(entityId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["entity-events", "timeline", entityId, page, limit],
    queryFn: async () => {
      const res = await entityEventsApi.getTimeline(entityId, { page, limit });
      const raw = res.data;
      return {
        data: Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [],
        total: typeof raw?.total === "number" ? raw.total : 0,
      };
    },
    enabled: !!entityId,
  });
}

export function useRecentEvents(entityId: string, count = 10) {
  return useQuery({
    queryKey: ["entity-events", "recent", entityId, count],
    queryFn: async () => {
      const res = await entityEventsApi.getRecent(entityId, count);
      return res.data as any[];
    },
    enabled: !!entityId,
  });
}

export function useCreateEntityEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await entityEventsApi.create(data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["entity-events", "timeline", variables.entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ["entity-events", "recent", variables.entityId],
      });
    },
  });
}

// ============================================================================
// Batch Movement Hooks
// ============================================================================

export function useBatchMovements(batchId: string) {
  return useQuery({
    queryKey: ["batch-movements", "batch", batchId],
    queryFn: async () => {
      const res = await batchMovementsApi.getBatchHistory(batchId);
      return res.data as any[];
    },
    enabled: !!batchId,
  });
}

export function useContainerMovements(containerId: string) {
  return useQuery({
    queryKey: ["batch-movements", "container", containerId],
    queryFn: async () => {
      const res = await batchMovementsApi.getContainerMovements(containerId);
      return res.data as any[];
    },
    enabled: !!containerId,
  });
}

export function useCreateBatchMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await batchMovementsApi.create(data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["batch-movements", "batch", variables.batchId],
      });
      queryClient.invalidateQueries({ queryKey: ["machine-state"] });
    },
  });
}
