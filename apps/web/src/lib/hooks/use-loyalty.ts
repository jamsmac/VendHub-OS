"use client";

import { useQuery } from "@tanstack/react-query";
import { loyaltyApi } from "../api";

export interface LoyaltyStats {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  avgPointsPerUser: number;
  tierDistribution: Record<string, number>;
}

export interface TopLoyaltyUser {
  id: string;
  name: string;
  email: string | null;
  tier: string;
  totalPoints: number;
  totalOrders: number;
  joinedAt: string;
}

export interface LoyaltyTier {
  id: string;
  name: string;
  level: number;
  cashback_percent: number;
  multiplier: number;
  min_cash_percent: number;
  free_drink_frequency: number | null;
  overdraft_limit: number | null;
  sort_order: number;
}

export interface LoyaltyPrivilege {
  id: string;
  tier_id: string;
  privilege_name: string;
  description: string;
  sort_order: number;
}

export function useLoyaltyStats() {
  return useQuery({
    queryKey: ["loyalty-stats"],
    queryFn: async () => {
      const response = await loyaltyApi.getStats();
      return response.data as LoyaltyStats;
    },
  });
}

export function useTopLoyaltyUsers(limit = 10) {
  return useQuery({
    queryKey: ["top-loyalty-users", limit],
    queryFn: async () => {
      const response = await loyaltyApi.getLeaderboard({ limit });
      return (response.data.entries || []) as TopLoyaltyUser[];
    },
  });
}

export function useLoyaltyTiers() {
  return useQuery({
    queryKey: ["loyalty-tiers"],
    queryFn: async () => {
      const response = await loyaltyApi.getLevelsInfo();
      return (response.data.levels || []) as LoyaltyTier[];
    },
  });
}

export function useLoyaltyPrivileges() {
  return useQuery({
    queryKey: ["loyalty-privileges"],
    queryFn: async () => {
      const response = await loyaltyApi.getLevelsInfo();
      const tiers = (response.data.levels || []) as LoyaltyTier[];
      const privileges: LoyaltyPrivilege[] = [];

      tiers.forEach((tier) => {
        if (
          tier.cashback_percent ||
          tier.multiplier ||
          tier.free_drink_frequency !== null ||
          tier.overdraft_limit !== null
        ) {
          if (tier.cashback_percent) {
            privileges.push({
              id: `${tier.id}-cashback`,
              tier_id: tier.id,
              privilege_name: "Cashback",
              description: `${tier.cashback_percent}% cashback on purchases`,
              sort_order: tier.sort_order,
            });
          }
          if (tier.multiplier > 1) {
            privileges.push({
              id: `${tier.id}-multiplier`,
              tier_id: tier.id,
              privilege_name: "Points Multiplier",
              description: `${tier.multiplier}x points multiplier`,
              sort_order: tier.sort_order + 1,
            });
          }
          if (tier.free_drink_frequency) {
            privileges.push({
              id: `${tier.id}-free-drink`,
              tier_id: tier.id,
              privilege_name: "Free Drink",
              description: `Free drink every ${tier.free_drink_frequency} purchases`,
              sort_order: tier.sort_order + 2,
            });
          }
          if (tier.overdraft_limit) {
            privileges.push({
              id: `${tier.id}-overdraft`,
              tier_id: tier.id,
              privilege_name: "Overdraft Limit",
              description: `Up to ${tier.overdraft_limit} UZS overdraft allowed`,
              sort_order: tier.sort_order + 3,
            });
          }
        }
      });

      return privileges;
    },
  });
}
