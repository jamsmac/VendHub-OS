import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useProducts,
  useProduct,
  useProductStats,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useToggleProductAvailability,
  type DbProduct,
} from "../use-products";

jest.mock("../../api", () => ({
  productsApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { productsApi } from "../../api";
const mockGetAll = productsApi.getAll as jest.MockedFunction<
  typeof productsApi.getAll
>;
const mockGetById = productsApi.getById as jest.MockedFunction<
  typeof productsApi.getById
>;
const mockCreate = productsApi.create as jest.MockedFunction<
  typeof productsApi.create
>;
const mockUpdate = productsApi.update as jest.MockedFunction<
  typeof productsApi.update
>;
const mockDelete = productsApi.delete as jest.MockedFunction<
  typeof productsApi.delete
>;

const sampleProducts: DbProduct[] = [
  {
    id: "p-1",
    name: "Американо",
    name_uz: "Amerikano",
    price: 12000,
    category: "coffee",
    temperature: "hot",
    popular: true,
    available: true,
    image_url: null,
    description: "Классический кофе",
    description_uz: null,
    detail_description: null,
    detail_description_uz: null,
    rating: 4.5,
    options: null,
    is_new: false,
    discount_percent: null,
    sort_order: 1,
    calories: 5,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "p-2",
    name: "Сникерс",
    name_uz: "Snikers",
    price: 8000,
    category: "snacks",
    temperature: null,
    popular: false,
    available: true,
    image_url: null,
    description: null,
    description_uz: null,
    detail_description: null,
    detail_description_uz: null,
    rating: null,
    options: null,
    is_new: true,
    discount_percent: 10,
    sort_order: 5,
    calories: 250,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "p-3",
    name: "Зелёный чай",
    name_uz: "Yashil choy",
    price: 10000,
    category: "tea",
    temperature: "hot",
    popular: false,
    available: false,
    image_url: null,
    description: null,
    description_uz: null,
    detail_description: null,
    detail_description_uz: null,
    rating: null,
    options: null,
    is_new: false,
    discount_percent: null,
    sort_order: 3,
    calories: 0,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useProducts", () => {
  it("fetches all products", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleProducts } as never);

    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
  });
});

describe("useProduct", () => {
  it("fetches product by id", async () => {
    mockGetById.mockResolvedValueOnce({ data: sampleProducts[0] } as never);

    const { result } = renderHook(() => useProduct("p-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetById).toHaveBeenCalledWith("p-1");
    expect(result.current.data?.name).toBe("Американо");
  });

  it("is disabled when id is empty", () => {
    const { result } = renderHook(() => useProduct(""), {
      wrapper: createWrapperWithClient().wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useProductStats", () => {
  it("calculates stats from products data", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleProducts } as never);

    const { result } = renderHook(() => useProductStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const stats = result.current.data;
    expect(stats).toEqual({
      total: 3,
      available: 2,
      popular: 1,
      byCategory: {
        coffee: 1,
        tea: 1,
        other: 0,
        snacks: 1,
      },
    });
  });
});

describe("useCreateProduct", () => {
  it("creates product and invalidates queries", async () => {
    const newProduct = { ...sampleProducts[0], id: "p-new" };
    mockCreate.mockResolvedValueOnce({ data: newProduct } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateProduct(), { wrapper });

    const { id, created_at, updated_at, ...createData } = sampleProducts[0];
    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreate).toHaveBeenCalledWith(createData);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["product-stats"],
    });
  });
});

describe("useUpdateProduct", () => {
  it("updates product by id", async () => {
    const updated = { ...sampleProducts[0], price: 15000 };
    mockUpdate.mockResolvedValueOnce({ data: updated } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateProduct(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "p-1",
        data: { price: 15000 },
      });
    });

    expect(mockUpdate).toHaveBeenCalledWith("p-1", { price: 15000 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
  });
});

describe("useDeleteProduct", () => {
  it("deletes product and invalidates queries", async () => {
    mockDelete.mockResolvedValueOnce({} as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteProduct(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("p-1");
    });

    expect(mockDelete).toHaveBeenCalledWith("p-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["product-stats"],
    });
  });
});

describe("useToggleProductAvailability", () => {
  it("toggles availability to false", async () => {
    const toggled = { ...sampleProducts[0], available: false };
    mockUpdate.mockResolvedValueOnce({ data: toggled } as never);

    const { result } = renderHook(() => useToggleProductAvailability(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "p-1", available: false });
    });

    expect(mockUpdate).toHaveBeenCalledWith("p-1", { available: false });
  });

  it("toggles availability to true", async () => {
    const toggled = { ...sampleProducts[2], available: true };
    mockUpdate.mockResolvedValueOnce({ data: toggled } as never);

    const { result } = renderHook(() => useToggleProductAvailability(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "p-3", available: true });
    });

    expect(mockUpdate).toHaveBeenCalledWith("p-3", { available: true });
  });
});
