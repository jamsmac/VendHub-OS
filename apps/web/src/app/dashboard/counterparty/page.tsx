"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2, Search, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface Counterparty {
  id: string;
  name: string;
  shortName?: string;
  type: "client" | "supplier" | "partner" | "location_owner";
  inn: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  isActive: boolean;
  contracts?: Array<{ id: string; status: string }>;
}

const typeLabels: Record<string, string> = {
  client: "Client",
  supplier: "Supplier",
  partner: "Partner",
  location_owner: "Location Owner",
};

const typeColors: Record<string, string> = {
  client: "text-blue-600 bg-blue-100",
  supplier: "text-green-600 bg-green-100",
  partner: "text-purple-600 bg-purple-100",
  location_owner: "text-amber-600 bg-amber-100",
};

export default function CounterpartyPage() {
  const t = useTranslations("counterparty");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: counterparties, isLoading } = useQuery({
    queryKey: ["counterparties", typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (typeFilter !== "all") params.type = typeFilter;
      const res = await api.get("/counterparties", { params });
      return (res.data?.data ||
        res.data?.items ||
        res.data ||
        []) as Counterparty[];
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    if (!counterparties) return [];
    if (!search) return counterparties;
    const q = search.toLowerCase();
    return counterparties.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.inn.includes(q) ||
        c.contactPerson?.toLowerCase().includes(q),
    );
  }, [counterparties, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tCommon("search") || "Search by name or INN..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "client", "supplier", "partner", "location_owner"].map(
            (t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? tCommon("all") || "All" : typeLabels[t] || t}
              </Button>
            ),
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{t("noCounterparties") || "No counterparties found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((cp) => (
            <Card key={cp.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${cp.isActive ? "bg-green-100" : "bg-gray-100"}`}
                    >
                      <Building2
                        className={`h-5 w-5 ${cp.isActive ? "text-green-600" : "text-gray-400"}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cp.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${typeColors[cp.type] || typeColors.client}`}
                        >
                          {typeLabels[cp.type] || cp.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        INN: {cp.inn}
                        {cp.contactPerson && ` · ${cp.contactPerson}`}
                        {cp.phone && ` · ${cp.phone}`}
                      </p>
                    </div>
                  </div>
                  {cp.contracts && cp.contracts.length > 0 && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {cp.contracts.length} contracts
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
