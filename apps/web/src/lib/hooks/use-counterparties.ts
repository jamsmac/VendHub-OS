"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export interface DbCounterparty {
  id: string;
  name: string;
  type: "supplier" | "landlord" | "client" | "partner" | "service";
  inn: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  balance: number;
  status: "active" | "suspended";
  address: string | null;
  bank: string | null;
  account: string | null;
  mfo: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbContract {
  id: string;
  number: string;
  counterparty_id: string;
  counterparty_name: string | null;
  type: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  status: "active" | "expiring" | "expired";
  created_at: string;
}

export function useCounterparties() {
  return useQuery({
    queryKey: ["counterparties"],
    queryFn: async () => {
      const response = await api.get("/contractors");
      return (response.data.items || []) as DbCounterparty[];
    },
  });
}

export function useCounterparty(id: string) {
  return useQuery({
    queryKey: ["counterparties", id],
    queryFn: async () => {
      const response = await api.get(`/contractors/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useContracts() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const response = await api.get("/contractors/invoices/all");
      return (response.data.items || []) as DbContract[];
    },
  });
}

export function useCounterpartyStats() {
  return useQuery({
    queryKey: ["counterparty-stats"],
    queryFn: async () => {
      const response = await api.get("/contractors/stats");
      return response.data;
    },
  });
}
