import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useInvestorDashboard,
  useInvestorProfile,
  useCreateInvestorProfile,
  useCreateDividend,
} from "../use-investor";

jest.mock("../../api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { api } from "../../api";
const mockGet = api.get as jest.MockedFunction<typeof api.get>;
const mockPost = api.post as jest.MockedFunction<typeof api.post>;

const sampleDashboard = {
  profile: {
    id: "inv-1",
    name: "Investor A",
    sharePercent: 30,
    totalInvested: 50000000,
    paybackMonths: 24,
    status: "active",
    notes: null,
  },
  kpis: {
    totalRevenue: 10000000,
    netProfit: 3000000,
    totalMachines: 23,
    avgTransactionsPerDay: 150,
    avgCheck: 15000,
  },
  currentValue: 60000000,
  totalReturn: 10000000,
  roiPercent: 20,
  totalDividends: 5000000,
  dividends: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useInvestorDashboard", () => {
  it("fetches investor dashboard data", async () => {
    mockGet.mockResolvedValueOnce({ data: sampleDashboard } as never);

    const { result } = renderHook(() => useInvestorDashboard(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/investor/dashboard");
    expect(result.current.data?.roiPercent).toBe(20);
  });
});

describe("useInvestorProfile", () => {
  it("fetches investor profile", async () => {
    mockGet.mockResolvedValueOnce({
      data: sampleDashboard.profile,
    } as never);

    const { result } = renderHook(() => useInvestorProfile(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/investor/profile");
    expect(result.current.data?.name).toBe("Investor A");
  });
});

describe("useCreateInvestorProfile", () => {
  it("creates profile and invalidates caches", async () => {
    mockPost.mockResolvedValueOnce({ data: sampleDashboard.profile } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateInvestorProfile(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        name: "Investor B",
        sharePercent: 15,
        totalInvested: 30000000,
      });
    });

    expect(mockPost).toHaveBeenCalledWith("/investor/profiles", {
      name: "Investor B",
      sharePercent: 15,
      totalInvested: 30000000,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["investor-dashboard"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["investor-profile"],
    });
  });
});

describe("useCreateDividend", () => {
  it("creates dividend and invalidates dashboard", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: "div-1" } } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateDividend(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        investorProfileId: "inv-1",
        period: "2026-03",
        paymentDate: "2026-03-15",
        amount: 500000,
      });
    });

    expect(mockPost).toHaveBeenCalledWith("/investor/dividends", {
      investorProfileId: "inv-1",
      period: "2026-03",
      paymentDate: "2026-03-15",
      amount: 500000,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["investor-dashboard"],
    });
  });
});
