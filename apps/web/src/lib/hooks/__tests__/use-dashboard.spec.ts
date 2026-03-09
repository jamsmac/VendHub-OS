import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "./test-utils";
import {
  useDashboardKpi,
  useSalesChart,
  useDashboardAlerts,
  useRevenueStats,
  useRecentActivity,
  useDashboardSummary,
} from "../use-dashboard";

jest.mock("../../api", () => ({
  api: {
    get: jest.fn(),
  },
}));

import { api } from "../../api";
const mockGet = api.get as jest.MockedFunction<typeof api.get>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useDashboardKpi", () => {
  const kpiData = {
    totalMachines: 23,
    activeMachines: 19,
    totalProducts: 33,
    availableProducts: 28,
  };

  it("fetches KPI data from /analytics/dashboard/kpi", async () => {
    mockGet.mockResolvedValueOnce({ data: kpiData } as never);

    const { result } = renderHook(() => useDashboardKpi(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/analytics/dashboard/kpi");
    expect(result.current.data).toEqual(kpiData);
  });

  it("handles API errors gracefully", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useDashboardKpi(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe("useSalesChart", () => {
  const chartData = [
    { date: "2026-03-01", sales: 150000, orders: 45 },
    { date: "2026-03-02", sales: 180000, orders: 52 },
  ];

  it("fetches sales chart with default 7 days", async () => {
    mockGet.mockResolvedValueOnce({ data: chartData } as never);

    const { result } = renderHook(() => useSalesChart(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/analytics/dashboard/sales-chart", {
      params: { days: 7 },
    });
    expect(result.current.data).toEqual(chartData);
  });

  it("accepts custom days parameter", async () => {
    mockGet.mockResolvedValueOnce({ data: chartData } as never);

    const { result } = renderHook(() => useSalesChart(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/analytics/dashboard/sales-chart", {
      params: { days: 30 },
    });
  });
});

describe("useDashboardAlerts", () => {
  it("fetches alerts from /alerts", async () => {
    const alerts = [
      {
        id: "1",
        type: "offline",
        severity: "critical",
        title: "Machine VH-005 offline",
      },
    ];
    mockGet.mockResolvedValueOnce({ data: alerts } as never);

    const { result } = renderHook(() => useDashboardAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/alerts");
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useRevenueStats", () => {
  it("fetches revenue stats with default 30 days", async () => {
    const stats = {
      totalRevenue: 5000000,
      averageDailyRevenue: 166666,
      trend: 12.5,
      currency: "UZS",
    };
    mockGet.mockResolvedValueOnce({ data: stats } as never);

    const { result } = renderHook(() => useRevenueStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/analytics/dashboard/revenue-stats", {
      params: { days: 30 },
    });
    expect(result.current.data).toEqual(stats);
  });
});

describe("useRecentActivity", () => {
  it("fetches activity with default limit 10", async () => {
    const activity = [
      {
        id: "1",
        user: "admin",
        action: "login",
        resource: "auth",
        details: "Successful login",
        timestamp: "2026-03-09T10:00:00Z",
      },
    ];
    mockGet.mockResolvedValueOnce({ data: activity } as never);

    const { result } = renderHook(() => useRecentActivity(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/audit", { params: { limit: 10 } });
  });
});

describe("useDashboardSummary", () => {
  it("fetches complete dashboard summary", async () => {
    const summary = {
      kpi: { totalMachines: 23, activeMachines: 19 },
      alerts: [],
      revenueStats: { totalRevenue: 5000000 },
      recentActivity: [],
    };
    mockGet.mockResolvedValueOnce({ data: summary } as never);

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/analytics/dashboard/summary");
    expect(result.current.data).toEqual(summary);
  });
});
