import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cmsApi } from "../api";

export interface CmsArticle {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  authorId: string | null;
  sortOrder: number;
  tags: string[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Hook to fetch CMS articles (paginated)
 */
export function useCmsArticles(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  isPublished?: boolean;
}) {
  return useQuery({
    queryKey: ["cms-articles", params],
    queryFn: () => cmsApi.listArticles(params),
  });
}

/**
 * Hook to fetch a single CMS article by ID or slug
 */
export function useCmsArticle(idOrSlug: string, enabled = true) {
  return useQuery({
    queryKey: ["cms-article", idOrSlug],
    queryFn: () => cmsApi.getArticle(idOrSlug),
    enabled,
  });
}

/**
 * Hook to fetch articles by category
 */
export function useCmsArticlesByCategory(category: string) {
  return useQuery({
    queryKey: ["cms-articles", "category", category],
    queryFn: () => cmsApi.getByCategory(category),
  });
}

/**
 * Hook to create a CMS article
 */
export function useCreateCmsArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      category?: string;
      isPublished?: boolean;
      tags?: string[];
      metaTitle?: string;
      metaDescription?: string;
    }) => {
      return cmsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-articles"] });
    },
  });
}

/**
 * Hook to update a CMS article
 */
export function useUpdateCmsArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        content?: string;
        category?: string;
        isPublished?: boolean;
        tags?: string[];
        metaTitle?: string;
        metaDescription?: string;
      };
    }) => {
      return cmsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-articles"] });
    },
  });
}

/**
 * Hook to delete a CMS article
 */
export function useDeleteCmsArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return cmsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-articles"] });
    },
  });
}
