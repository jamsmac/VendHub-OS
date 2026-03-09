import { renderHook, waitFor } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useReportDefinitions,
  useSalesReport,
  useReportStats,
} from "../use-reports";

jest.mock("../../api", () => ({
  reportsApi: {
    getDefinitions: jest.fn(),
    getSales: jest.fn(),
    getDashboard: jest.fn(),
  },
}));

import { reportsApi } from "../../api";
const mockGetDefinitions = reportsApi.getDefinitions as jest.MockedFunction<
  typeof reportsApi.getDefinitions
>;
const mockGetSales = reportsApi.getSales as jest.MockedFunction<
  typeof reportsApi.getSales
>;
const mockGetDashboard = reportsApi.getDashboard as jest.MockedFunction<
  typeof reportsApi.getDashboard
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useReportDefinitions", () => {
  it("fetches report definitions", async () => {
    const defs = [
      {
        id: "r-1",
        name: "Ежемесячный отчёт",
        type: "sales",
        is_active: true,
      },
    ];
    mockGetDefinitions.mockResolvedValueOnce({ data: defs } as never);

    const { result } = renderHook(() => useReportDefinitions(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useSalesReport", () => {
  it("fetches sales report with date range", async () => {
    const rows = [
      {
        date: "2026-03-01",
        machine_id: "m-1",
        machine_name: "VH-005",
        product_id: "p-1",
        product_name: "Американо",
        quantity: 45,
        revenue: 540000,
        avg_check: 12000,
      },
    ];
    mockGetSales.mockResolvedValueOnce({ data: rows } as never);

    const { result } = renderHook(
      () => useSalesReport("2026-03-01", "2026-03-09"),
      { wrapper: createWrapperWithClient().wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetSales).toHaveBeenCalledWith({
      dateFrom: "2026-03-01",
      dateTo: "2026-03-09",
      groupBy: "day",
    });
    expect(result.current.data).toHaveLength(1);
  });

  it("is disabled when dates are empty", () => {
    const { result } = renderHook(() => useSalesReport("", ""), {
      wrapper: createWrapperWithClient().wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("accepts custom groupBy parameter", async () => {
    mockGetSales.mockResolvedValueOnce({ data: [] } as never);

    renderHook(() => useSalesReport("2026-03-01", "2026-03-09", "month"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() =>
      expect(mockGetSales).toHaveBeenCalledWith({
        dateFrom: "2026-03-01",
        dateTo: "2026-03-09",
        groupBy: "month",
      }),
    );
  });
});

describe("useReportStats", () => {
  it("returns report stats stub", async () => {
    mockGetDashboard.mockResolvedValueOnce({ data: {} } as never);

    const { result } = renderHook(() => useReportStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      totalReports: 0,
      lastGenerated: null,
      scheduledReports: 0,
    });
  });
});
