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
const mockDelete = api.delete as jest.MockedFunction<typeof api.delete>;

const sampleDeposit = {
  id: "dep-1",
  amount: 500000,
  depositDate: "2026-03-09",
  notes: "Ежедневный депозит",
  createdAt: "2026-03-09T10:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useFinanceTransactions", () => {
  it("fetches deposits from /finance/deposits and transforms to transactions", async () => {
    mockGet.mockResolvedValueOnce({ data: [sampleDeposit] } as never);

    const { result } = renderHook(() => useFinanceTransactions(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/finance/deposits");
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({
      id: "dep-1",
      type: "expense",
      category: "bank_deposit",
      amount: 500000,
      payment_method: "bank_transfer",
      status: "completed",
    });
  });

  it("respects limit parameter", async () => {
    const deposits = Array.from({ length: 20 }, (_, i) => ({
      ...sampleDeposit,
      id: `dep-${i}`,
    }));
    mockGet.mockResolvedValueOnce({ data: deposits } as never);

    const { result } = renderHook(() => useFinanceTransactions(5), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(5);
  });
});

describe("useFinanceStats", () => {
  it("fetches balance from /finance/balance and maps to FinanceStats", async () => {
    const balance = { received: 5000000, deposited: 2000000, balance: 3000000 };
    mockGet.mockResolvedValueOnce({ data: balance } as never);

    const { result } = renderHook(() => useFinanceStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/finance/balance");
    expect(result.current.data).toEqual({
      totalRevenue: 5000000,
      totalExpenses: 2000000,
      netProfit: 3000000,
      pendingPayouts: 0,
      taxDue: 0,
    });
  });
});

describe("useDailyRevenue", () => {
  it("fetches from /analytics/daily with date range params", async () => {
    mockGet.mockResolvedValueOnce({ data: [] } as never);

    const { result } = renderHook(() => useDailyRevenue(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/analytics/daily", {
      params: expect.objectContaining({
        from: expect.any(String),
        to: expect.any(String),
      }),
    });
  });
});

describe("usePayoutRequests", () => {
  it("returns empty array (no backend endpoint)", async () => {
    const { result } = renderHook(() => usePayoutRequests(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useCreateFinanceTransaction", () => {
  it("posts to /finance/deposits and invalidates caches", async () => {
    mockPost.mockResolvedValueOnce({ data: sampleDeposit } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateFinanceTransaction(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        type: "expense",
        category: "bank_deposit",
        description: "Test deposit",
        amount: 500000,
        counterparty_id: null,
        counterparty_name: null,
        payment_method: "bank_transfer",
        machine_id: null,
        status: "completed",
      });
    });

    expect(mockPost).toHaveBeenCalledWith("/finance/deposits", {
      amount: 500000,
      date: expect.any(String),
      notes: "Test deposit",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["finance-transactions"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["finance-stats"],
    });
  });
});

describe("useUpdateFinanceTransaction", () => {
  it("logs warning (deposits are immutable)", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();

    const { result } = renderHook(() => useUpdateFinanceTransaction(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "dep-1",
        updates: { amount: 600000 },
      });
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Update not supported"),
    );
    warnSpy.mockRestore();
  });
});

describe("useDeleteFinanceTransaction", () => {
  it("deletes via /finance/deposits/:id and invalidates", async () => {
    mockDelete.mockResolvedValueOnce({} as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteFinanceTransaction(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("dep-1");
    });

    expect(mockDelete).toHaveBeenCalledWith("/finance/deposits/dep-1");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["finance-transactions"],
    });
  });
});
