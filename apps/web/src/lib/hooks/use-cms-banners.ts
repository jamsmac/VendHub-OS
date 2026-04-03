import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { AxiosResponse } from "axios";

export interface CmsBanner {
  id: string;
  organizationId: string;
  titleRu: string;
  descriptionRu: string | null;
  titleUz: string | null;
  descriptionUz: string | null;
  imageUrl: string | null;
  imageUrlMobile: string | null;
  linkUrl: string | null;
  buttonTextRu: string | null;
  buttonTextUz: string | null;
  position: "hero" | "top" | "sidebar" | "popup" | "inline";
  status: "draft" | "active" | "scheduled" | "expired" | "archived";
  sortOrder: number;
  validFrom: string | null;
  validUntil: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateBannerInput = {
  titleRu: string;
  descriptionRu?: string;
  titleUz?: string;
  descriptionUz?: string;
  imageUrl?: string;
  imageUrlMobile?: string;
  linkUrl?: string;
  buttonTextRu?: string;
  buttonTextUz?: string;
  position?: CmsBanner["position"];
  status?: CmsBanner["status"];
  sortOrder?: number;
  validFrom?: string;
  validUntil?: string;
  backgroundColor?: string;
  textColor?: string;
};

export type UpdateBannerInput = Partial<CreateBannerInput>;

export function useCmsBanners(position?: string) {
  return useQuery({
    queryKey: ["cms-banners", position],
    queryFn: () =>
      api
        .get("/cms/banners", { params: position ? { position } : undefined })
        .then((r: AxiosResponse) => r.data),
  });
}

export function useCmsBannerById(id: string, enabled = true) {
  return useQuery({
    queryKey: ["cms-banners", id],
    queryFn: () =>
      api.get(`/cms/banners/${id}`).then((r: AxiosResponse) => r.data),
    enabled,
  });
}

export function useCreateCmsBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBannerInput) =>
      api.post("/cms/banners", data).then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-banners"] });
    },
  });
}

export function useUpdateCmsBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBannerInput }) =>
      api.patch(`/cms/banners/${id}`, data).then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-banners"] });
    },
  });
}

export function useDeleteCmsBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/cms/banners/${id}`).then((r: AxiosResponse) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-banners"] });
    },
  });
}
