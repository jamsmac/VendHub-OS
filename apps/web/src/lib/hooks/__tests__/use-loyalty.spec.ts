import { renderHook, waitFor } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useLoyaltyStats,
  useTopLoyaltyUsers,
  useLoyaltyTiers,
  useLoyaltyPrivileges,
} from "../use-loyalty";

jest.mock("../../api", () => ({
  loyaltyApi: {
    getStats: jest.fn(),
    getLeaderboard: jest.fn(),
    getLevelsInfo: jest.fn(),
  },
}));

import { loyaltyApi } from "../../api";
const mockGetStats = loyaltyApi.getStats as jest.MockedFunction<
  typeof loyaltyApi.getStats
>;
const mockGetLeaderboard = loyaltyApi.getLeaderboard as jest.MockedFunction<
  typeof loyaltyApi.getLeaderboard
>;
const mockGetLevelsInfo = loyaltyApi.getLevelsInfo as jest.MockedFunction<
  typeof loyaltyApi.getLevelsInfo
>;

const sampleTiers = [
  {
    id: "t-1",
    name: "Bronze",
    level: 1,
    cashback_percent: 3,
    multiplier: 1,
    min_cash_percent: 0,
    free_drink_frequency: null,
    overdraft_limit: null,
    sort_order: 1,
  },
  {
    id: "t-2",
    name: "Gold",
    level: 3,
    cashback_percent: 7,
    multiplier: 2,
    min_cash_percent: 10,
    free_drink_frequency: 10,
    overdraft_limit: 50000,
    sort_order: 3,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useLoyaltyStats", () => {
  it("fetches loyalty stats", async () => {
    const stats = {
      totalMembers: 150,
      activeMembers: 120,
      totalPointsIssued: 500000,
      totalPointsRedeemed: 200000,
      avgPointsPerUser: 3333,
      tierDistribution: { bronze: 80, silver: 30, gold: 10 },
    };
    mockGetStats.mockResolvedValueOnce({ data: stats } as never);

    const { result } = renderHook(() => useLoyaltyStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalMembers).toBe(150);
  });
});

describe("useTopLoyaltyUsers", () => {
  it("fetches leaderboard with default limit 10", async () => {
    const users = [
      {
        id: "u-1",
        name: "Иванов",
        email: null,
        tier: "gold",
        totalPoints: 10000,
        totalOrders: 50,
        joinedAt: "2026-01-01T00:00:00Z",
      },
    ];
    mockGetLeaderboard.mockResolvedValueOnce({ data: users } as never);

    const { result } = renderHook(() => useTopLoyaltyUsers(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetLeaderboard).toHaveBeenCalledWith({ limit: 10 });
    expect(result.current.data).toHaveLength(1);
  });

  it("accepts custom limit", async () => {
    mockGetLeaderboard.mockResolvedValueOnce({ data: [] } as never);

    renderHook(() => useTopLoyaltyUsers(5), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() =>
      expect(mockGetLeaderboard).toHaveBeenCalledWith({ limit: 5 }),
    );
  });
});

describe("useLoyaltyTiers", () => {
  it("fetches tiers", async () => {
    mockGetLevelsInfo.mockResolvedValueOnce({ data: sampleTiers } as never);

    const { result } = renderHook(() => useLoyaltyTiers(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe("Bronze");
  });
});

describe("useLoyaltyPrivileges", () => {
  it("derives privileges from tiers", async () => {
    mockGetLevelsInfo.mockResolvedValueOnce({ data: sampleTiers } as never);

    const { result } = renderHook(() => useLoyaltyPrivileges(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const privileges = result.current.data!;
    // Bronze: cashback only (multiplier=1 not added, no free_drink, no overdraft)
    // Gold: cashback + multiplier + free_drink + overdraft = 4
    expect(privileges.length).toBe(5); // 1 (bronze) + 4 (gold)

    const goldCashback = privileges.find(
      (p) => p.tier_id === "t-2" && p.privilege_name === "Cashback",
    );
    expect(goldCashback?.description).toBe("7% cashback on purchases");

    const goldMultiplier = privileges.find(
      (p) => p.tier_id === "t-2" && p.privilege_name === "Points Multiplier",
    );
    expect(goldMultiplier?.description).toBe("2x points multiplier");

    const goldFreeDrink = privileges.find(
      (p) => p.tier_id === "t-2" && p.privilege_name === "Free Drink",
    );
    expect(goldFreeDrink?.description).toBe("Free drink every 10 purchases");

    const goldOverdraft = privileges.find(
      (p) => p.tier_id === "t-2" && p.privilege_name === "Overdraft Limit",
    );
    expect(goldOverdraft?.description).toBe(
      "Up to 50000 UZS overdraft allowed",
    );
  });
});
