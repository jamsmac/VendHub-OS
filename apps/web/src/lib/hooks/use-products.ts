"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "../api";

export interface DbProduct {
  id: string;
  name: string;
  name_uz: string | null;
  price: number;
  category: string;
  temperature: string | null;
  popular: boolean;
  available: boolean;
  image_url: string | null;
  description: string | null;
  description_uz: string | null;
  detail_description: string | null;
  detail_description_uz: string | null;
  rating: number | null;
  options: unknown;
  is_new: boolean;
  discount_percent: number | null;
  sort_order: number | null;
  calories: number | null;
  created_at: string;
  updated_at: string;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await productsApi.getAll();
      return response.data as DbProduct[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const response = await productsApi.getById(id);
      return response.data as DbProduct;
    },
    enabled: !!id,
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: ["product-stats"],
    queryFn: async () => {
      const response = await productsApi.getAll();
      const products = response.data as DbProduct[];

      return {
        total: products.length,
        available: products.filter((p) => p.available).length,
        popular: products.filter((p) => p.popular).length,
        byCategory: {
          coffee: products.filter((p) => p.category === "coffee").length,
          tea: products.filter((p) => p.category === "tea").length,
          other: products.filter((p) => p.category === "other").length,
          snacks: products.filter((p) => p.category === "snacks").length,
        },
      };
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<DbProduct, "id" | "created_at" | "updated_at">,
    ) => {
      const response = await productsApi.create(data);
      return response.data as DbProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<DbProduct>;
    }) => {
      const response = await productsApi.update(id, data);
      return response.data as DbProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await productsApi.delete(id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
    },
  });
}

export function useToggleProductAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      available,
    }: {
      id: string;
      available: boolean;
    }) => {
      const response = await productsApi.update(id, { available });
      return response.data as DbProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
    },
  });
}
