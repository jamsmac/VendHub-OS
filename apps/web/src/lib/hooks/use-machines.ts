"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "../api";

export interface DbMachine {
  id: string;
  name: string;
  address: string;
  address_uz: string | null;
  type: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  review_count: number | null;
  floor: string | null;
  hours: string | null;
  product_count: number | null;
  has_promotion: boolean;
  location_type: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useMachines() {
  return useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const response = await machinesApi.getAll();
      return (response.data.data || []) as DbMachine[];
    },
  });
}

export function useMachine(id: string) {
  return useQuery({
    queryKey: ["machines", id],
    queryFn: async () => {
      const response = await machinesApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useMachineStats() {
  return useQuery({
    queryKey: ["machine-stats"],
    queryFn: async () => {
      const response = await machinesApi.getStats();
      return response.data;
    },
  });
}

export function useUpdateMachineStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await machinesApi.update(id, {
        status,
        updated_at: new Date().toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["machine-stats"] });
    },
  });
}
