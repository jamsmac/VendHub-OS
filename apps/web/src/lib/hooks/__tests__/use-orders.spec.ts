import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useOrders,
  useOrder,
  useOrderStats,
  useCreateOrder,
  useUpdateOrderStatus,
  useDeleteOrder,
} from "../use-orders";

jest.mock("../../api", () => ({
  tripsApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    start: jest.fn(),
    cancel: jest.fn(),
  },
}));

import { tripsApi } from "../../api";
const mockGetAll = tripsApi.getAll as jest.MockedFunction<
  typeof tripsApi.getAll
>;
const mockGetById = tripsApi.getById as jest.MockedFunction<
  typeof tripsApi.getById
>;
const mockStart = tripsApi.start as jest.MockedFunction<typeof tripsApi.start>;
const mockCancel = tripsApi.cancel as jest.MockedFunction<
  typeof tripsApi.cancel
>;

const sampleOrders = [
  {
    id: "o-1",
    customer_name: "Клиент 1",
    customer_phone: "+998901111111",
    machine_id: "m-1",
    machine_name: "VH-005",
    items: [
      {
        product_id: "p-1",
        product_name: "Американо",
        quantity: 2,
        price: 12000,
      },
    ],
    total: 24000,
    status: "completed" as const,
    payment_method: "card",
    created_at: "2026-03-09T10:00:00Z",
  },
  {
    id: "o-2",
    customer_name: null,
    customer_phone: null,
    machine_id: "m-2",
    machine_name: "VH-010",
    items: [
      { product_id: "p-2", product_name: "Сникерс", quantity: 1, price: 8000 },
    ],
    total: 8000,
    status: "cancelled" as const,
    payment_method: "cash",
    created_at: "2026-03-09T11:00:00Z",
  },
  {
    id: "o-3",
    customer_name: "Клиент 3",
    customer_phone: null,
    machine_id: "m-1",
    machine_name: "VH-005",
    items: [],
    total: 15000,
    status: "new" as const,
    payment_method: "payme",
    created_at: "2026-03-09T12:00:00Z",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useOrders", () => {
  it("fetches orders with default limit 50", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleOrders } as never);

    const { result } = renderHook(() => useOrders(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetAll).toHaveBeenCalledWith({ limit: "50" });
    expect(result.current.data).toHaveLength(3);
  });

  it("accepts custom limit", async () => {
    mockGetAll.mockResolvedValueOnce({ data: [] } as never);

    renderHook(() => useOrders(10), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() =>
      expect(mockGetAll).toHaveBeenCalledWith({ limit: "10" }),
    );
  });
});

describe("useOrder", () => {
  it("fetches order by id", async () => {
    mockGetById.mockResolvedValueOnce({ data: sampleOrders[0] } as never);

    const { result } = renderHook(() => useOrder("o-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetById).toHaveBeenCalledWith("o-1");
  });

  it("is disabled when id is empty", () => {
    const { result } = renderHook(() => useOrder(""), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useOrderStats", () => {
  it("calculates stats from orders", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleOrders } as never);

    const { result } = renderHook(() => useOrderStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const stats = result.current.data!;
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.cancelled).toBe(1);
    expect(stats.revenue).toBe(47000); // 24000 + 8000 + 15000
    expect(stats.avgOrderValue).toBeCloseTo(15666.67, 0);
  });

  it("handles empty orders list", async () => {
    mockGetAll.mockResolvedValueOnce({ data: [] } as never);

    const { result } = renderHook(() => useOrderStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      total: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
      avgOrderValue: 0,
    });
  });
});

describe("useCreateOrder", () => {
  it("creates order and invalidates caches", async () => {
    mockStart.mockResolvedValueOnce({ data: sampleOrders[0] } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateOrder(), { wrapper });

    const { id, created_at, ...orderData } = sampleOrders[0];
    await act(async () => {
      await result.current.mutateAsync(orderData as never);
    });

    expect(mockStart).toHaveBeenCalledWith(orderData);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["orders"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["order-stats"],
    });
  });
});

describe("useUpdateOrderStatus", () => {
  it("updates order status", async () => {
    mockGetById.mockResolvedValueOnce({ data: sampleOrders[0] } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "o-3",
        _status: "processing",
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["orders"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["order-stats"],
    });
  });
});

describe("useDeleteOrder", () => {
  it("deletes order via cancel and invalidates", async () => {
    mockCancel.mockResolvedValueOnce({} as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteOrder(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("o-1");
    });

    expect(mockCancel).toHaveBeenCalledWith("o-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["orders"] });
  });
});
