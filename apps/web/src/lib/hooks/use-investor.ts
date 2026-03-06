"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export interface InvestorProfile {
  id: string;
  name: string;
  sharePercent: number;
  totalInvested: number;
  paybackMonths: number | null;
  status: string;
  notes: string | null;
}

export interface DividendPayment {
  id: string;
  investorProfileId: string;
  period: string;
  paymentDate: string;
  amount: number;
  status: string;
  notes: string | null;
}

export interface InvestorDashboard {
  profile: InvestorProfile;
  kpis: {
    totalRevenue: number;
    netProfit: number;
    totalMachines: number;
    avgTransactionsPerDay: number;
    avgCheck: number;
  };
  currentValue: number;
  totalReturn: number;
  roiPercent: number;
  totalDividends: number;
  dividends: DividendPayment[];
}

export function useInvestorDashboard() {
  return useQuery({
    queryKey: ["investor-dashboard"],
    queryFn: async () => {
      const response = await api.get("/investor/dashboard");
      return response.data as InvestorDashboard;
    },
  });
}

export function useInvestorProfile() {
  return useQuery({
    queryKey: ["investor-profile"],
    queryFn: async () => {
      const response = await api.get("/investor/profile");
      return response.data as InvestorProfile | null;
    },
  });
}

export function useCreateInvestorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      sharePercent: number;
      totalInvested: number;
      paybackMonths?: number;
      notes?: string;
    }) => {
      const response = await api.post("/investor/profiles", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["investor-profile"] });
    },
  });
}

export function useCreateDividend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      investorProfileId: string;
      period: string;
      paymentDate: string;
      amount: number;
      notes?: string;
    }) => {
      const response = await api.post("/investor/dividends", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-dashboard"] });
    },
  });
}
