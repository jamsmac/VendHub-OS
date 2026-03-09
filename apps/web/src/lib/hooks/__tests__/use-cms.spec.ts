import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useCmsArticles,
  useCmsArticle,
  useCmsArticlesByCategory,
  useCreateCmsArticle,
  useUpdateCmsArticle,
  useDeleteCmsArticle,
} from "../use-cms";

jest.mock("../../api", () => ({
  cmsApi: {
    listArticles: jest.fn(),
    getArticle: jest.fn(),
    getByCategory: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { cmsApi } from "../../api";
const mockListArticles = cmsApi.listArticles as jest.MockedFunction<
  typeof cmsApi.listArticles
>;
const mockGetArticle = cmsApi.getArticle as jest.MockedFunction<
  typeof cmsApi.getArticle
>;
const mockGetByCategory = cmsApi.getByCategory as jest.MockedFunction<
  typeof cmsApi.getByCategory
>;
const mockCreate = cmsApi.create as jest.MockedFunction<typeof cmsApi.create>;
const mockUpdate = cmsApi.update as jest.MockedFunction<typeof cmsApi.update>;
const mockDelete = cmsApi.delete as jest.MockedFunction<typeof cmsApi.delete>;

const sampleArticle = {
  id: "art-1",
  organizationId: "org-1",
  title: "О компании",
  slug: "about",
  content: "<p>VendHub — платформа управления вендинговыми автоматами</p>",
  category: "general",
  isPublished: true,
  publishedAt: "2026-03-01T10:00:00Z",
  authorId: "u-1",
  sortOrder: 1,
  tags: ["about", "info"],
  metaTitle: "О нас",
  metaDescription: "Информация о VendHub",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useCmsArticles", () => {
  it("fetches articles", async () => {
    // cmsApi methods resolve to data directly (no .data wrapper)
    mockListArticles.mockResolvedValueOnce([sampleArticle] as never);

    const { result } = renderHook(() => useCmsArticles(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListArticles).toHaveBeenCalledWith(undefined);
  });

  it("passes params when provided", async () => {
    mockListArticles.mockResolvedValueOnce([] as never);

    renderHook(() => useCmsArticles({ limit: 5, category: "general" }), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() =>
      expect(mockListArticles).toHaveBeenCalledWith({
        limit: 5,
        category: "general",
      }),
    );
  });
});

describe("useCmsArticle", () => {
  it("fetches article by id or slug", async () => {
    mockGetArticle.mockResolvedValueOnce(sampleArticle as never);

    const { result } = renderHook(() => useCmsArticle("about"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetArticle).toHaveBeenCalledWith("about");
  });

  it("can be disabled", () => {
    const { result } = renderHook(() => useCmsArticle("about", false), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useCmsArticlesByCategory", () => {
  it("fetches articles by category", async () => {
    mockGetByCategory.mockResolvedValueOnce([sampleArticle] as never);

    const { result } = renderHook(() => useCmsArticlesByCategory("general"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetByCategory).toHaveBeenCalledWith("general");
  });
});

describe("useCreateCmsArticle", () => {
  it("creates article and invalidates cache", async () => {
    mockCreate.mockResolvedValueOnce(sampleArticle as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateCmsArticle(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        title: "Новая статья",
        content: "<p>Контент</p>",
      });
    });

    expect(mockCreate).toHaveBeenCalledWith({
      title: "Новая статья",
      content: "<p>Контент</p>",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["cms-articles"],
    });
  });
});

describe("useUpdateCmsArticle", () => {
  it("updates article by id", async () => {
    mockUpdate.mockResolvedValueOnce(sampleArticle as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateCmsArticle(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "art-1",
        data: { title: "Обновлённый заголовок" },
      });
    });

    expect(mockUpdate).toHaveBeenCalledWith("art-1", {
      title: "Обновлённый заголовок",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["cms-articles"],
    });
  });
});

describe("useDeleteCmsArticle", () => {
  it("deletes article and invalidates", async () => {
    mockDelete.mockResolvedValueOnce(undefined as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteCmsArticle(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("art-1");
    });

    expect(mockDelete).toHaveBeenCalledWith("art-1");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["cms-articles"],
    });
  });
});
