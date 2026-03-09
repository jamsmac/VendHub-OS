import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useFinanceTransactions,
  useFinanceStats,
  useDailyRevenue,
  usePayoutRequests,
  useCreateFinanceTransaction,
  useUpdateFinanceTransaction,
  useDeleteFinanceTransaction,
} from "../use-finance";

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

const sampleTransaction = {
  id: "ft-1",
  type: "income",
  category: "sales",
  description: "Продажи VH-005",
  amount: 500000,
  counterparty_id: null,
  counterparty_name: null,
  payment_method: "card",
  machine_id: "m-1",
  status: "completed",
  created_at: "2026-03-09T10:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useFinanceTransactions", () => {
  it("fetches transactions with default limit 50", async () => {
    mockGet.mockResolvedValueOnce({ data: [sampleTransaction] } as never);

    const { result } = renderHook(() => useFinanceTransactions(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/cash-finance/transactions", {
      params: { limit: 50 },
    });
  });

  it("accepts custom limit", async () => {
    mockGet.mockResolvedValueOnce({ data: [] } as never);

    renderHook(() => useFinanceTransactions(10), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/cash-finance/transactions", {
        params: { limit: 10 },
      }),
    );
  });
});

describe("useFinanceStats", () => {
  it("fetches finance stats", async () => {
    const stats = {
      totalRevenue: 5000000,
      totalExpenses: 2000000,
      netProfit: 3000000,
      pendingPayouts: 100000,
      taxDue: 450000,
    };
    mockGet.mockResolvedValueOnce({ data: stats } as never);

    const { result } = renderHook(() => useFinanceStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/cash-finance/stats");
    expect(result.current.data).toEqual(stats);
  });
});

describe("useDailyRevenue", () => {
  it("fetches daily revenue with default 30 days", async () => {
    mockGet.mockResolvedValueOnce({ data: [] } as never);

    const { result } = renderHook(() => useDailyRevenue(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/cash-finance/daily-revenue", {
      params: { days: 30 },
    });
  });
});

describe("usePayoutRequests", () => {
  it("fetches payout requests", async () => {
    mockGet.mockResolvedValueOnce({ data: [] } as never);

    const { result } = renderHook(() => usePayoutRequests(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/cash-finance/payout-requests");
  });
});

describe("useCreateFinanceTransaction", () => {
  it("creates transaction and invalidates caches", async () => {
    mockPost.mockResolvedValueOnce({ data: sampleTransaction } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateFinanceTransaction(), {
      wrapper,
    });

    const { id, created_at, ...createData } = sampleTransaction;
    await act(async () => {
      await result.current.mutateAsync(createData as never);
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/cash-finance/transactions",
      createData,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["finance-transactions"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["finance-stats"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["daily-revenue"],
    });
  });
});

describe("useUpdateFinanceTransaction", () => {
  it("updates transaction by id", async () => {
    mockPatch.mockResolvedValueOnce({ data: sampleTransaction } as never);

    const { result } = renderHook(() => useUpdateFinanceTransaction(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "ft-1",
        updates: { amount: 600000 },
      });
    });

    expect(mockPatch).toHaveBeenCalledWith("/cash-finance/transactions/ft-1", {
      amount: 600000,
    });
  });
});

describe("useDeleteFinanceTransaction", () => {
  it("deletes transaction and invalidates", async () => {
    mockDelete.mockResolvedValueOnce({} as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteFinanceTransaction(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("ft-1");
    });

    expect(mockDelete).toHaveBeenCalledWith("/cash-finance/transactions/ft-1");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["finance-transactions"],
    });
  });
});
