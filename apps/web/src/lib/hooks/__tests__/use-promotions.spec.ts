import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  usePromotions,
  usePromotion,
  usePromotionStats,
  useCreatePromotion,
  useUpdatePromotion,
  useTogglePromotionStatus,
  useDeletePromotion,
} from "../use-promotions";

jest.mock("../../api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { api } from "../../api";
const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;
const mockPatch = api.patch as jest.MockedFunction<typeof api.patch>;
const mockDelete = api.delete as jest.MockedFunction<typeof api.delete>;

const samplePromotion = {
  id: "promo-1",
  title: "Летняя акция",
  description: "Скидка 20% на все напитки",
  type: "discount",
  discount_value: 20,
  discount_type: "percent",
  start_date: "2026-06-01",
  end_date: "2026-08-31",
  is_active: true,
  usage_count: 150,
  max_usage: 1000,
  target_audience: null,
  created_at: "2026-05-15T10:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("usePromotions", () => {
  it("fetches all promotions", async () => {
    mockGet.mockResolvedValueOnce({ data: [samplePromotion] } as never);

    const { result } = renderHook(() => usePromotions(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/promo-codes");
  });
});

describe("usePromotion", () => {
  it("fetches promotion by id", async () => {
    mockGet.mockResolvedValueOnce({ data: samplePromotion } as never);

    const { result } = renderHook(() => usePromotion("promo-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/promo-codes/promo-1");
  });

  it("is disabled when id is empty", () => {
    const { result } = renderHook(() => usePromotion(""), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("usePromotionStats", () => {
  it("fetches promotion stats", async () => {
    const stats = {
      totalActive: 5,
      totalUsage: 1200,
      revenueImpact: 3000000,
      topPromotion: "Летняя акция",
    };
    mockGet.mockResolvedValueOnce({ data: stats } as never);

    const { result } = renderHook(() => usePromotionStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/promo-codes/stats");
  });
});

describe("useCreatePromotion", () => {
  it("creates promotion and invalidates caches", async () => {
    mockPost.mockResolvedValueOnce({ data: samplePromotion } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePromotion(), { wrapper });

    const { id, created_at, usage_count, ...createData } = samplePromotion;
    await act(async () => {
      await result.current.mutateAsync(createData as never);
    });

    expect(mockPost).toHaveBeenCalledWith("/promo-codes", {
      ...createData,
      usage_count: 0,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["promotions"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["promotion-stats"],
    });
  });
});

describe("useUpdatePromotion", () => {
  it("updates promotion by id", async () => {
    mockPatch.mockResolvedValueOnce({ data: samplePromotion } as never);

    const { result } = renderHook(() => useUpdatePromotion(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "promo-1",
        updates: { discount_value: 25 },
      });
    });

    expect(mockPatch).toHaveBeenCalledWith("/promo-codes/promo-1", {
      discount_value: 25,
    });
  });
});

describe("useTogglePromotionStatus", () => {
  it("toggles promotion status", async () => {
    mockPatch.mockResolvedValueOnce({
      data: { ...samplePromotion, is_active: false },
    } as never);

    const { result } = renderHook(() => useTogglePromotionStatus(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "promo-1", isActive: false });
    });

    expect(mockPatch).toHaveBeenCalledWith("/promo-codes/promo-1", {
      is_active: false,
    });
  });
});

describe("useDeletePromotion", () => {
  it("deletes promotion and invalidates", async () => {
    mockDelete.mockResolvedValueOnce({} as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeletePromotion(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("promo-1");
    });

    expect(mockDelete).toHaveBeenCalledWith("/promo-codes/promo-1");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["promotions"],
    });
  });
});
