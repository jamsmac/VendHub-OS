"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Tag, Search, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface PromoCode {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_product" | "bonus_points";
  value: number;
  description?: string;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  startDate?: string;
  endDate?: string;
  minOrderAmount?: number;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  percentage: "% Discount",
  fixed: "Fixed Amount",
  free_product: "Free Product",
  bonus_points: "Bonus Points",
};

export default function PromoCodesPage() {
  const t = useTranslations("promoCodes");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "expired"
  >("all");

  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => {
      const res = await api.get("/promo-codes");
      return (res.data?.data ||
        res.data?.items ||
        res.data ||
        []) as PromoCode[];
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!promoCodes) return [];
    let result = promoCodes;
    if (activeFilter === "active") result = result.filter((p) => p.isActive);
    if (activeFilter === "expired") result = result.filter((p) => !p.isActive);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [promoCodes, search, activeFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{promoCodes?.length ?? "—"}</p>
            <p className="text-sm text-muted-foreground">
              {t("total") || "Total"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {promoCodes?.filter((p) => p.isActive).length ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("active") || "Active"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {promoCodes?.reduce((sum, p) => sum + p.usageCount, 0) ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("totalUsed") || "Total Used"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tCommon("search") || "Search by code..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "expired"] as const).map((f) => (
            <Button
              key={f}
              variant={activeFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(f)}
            >
              {f === "all" ? tCommon("all") || "All" : f}
            </Button>
          ))}
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
            <Tag className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{t("noPromoCodes") || "No promo codes found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((promo) => (
            <Card key={promo.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${promo.isActive ? "bg-green-100" : "bg-gray-100"}`}
                    >
                      {promo.isActive ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-base">
                          {promo.code}
                        </code>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                          {typeLabels[promo.type] || promo.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {promo.description || "—"} · {promo.usageCount}/
                        {promo.usageLimit ?? "∞"} uses
                        {promo.endDate &&
                          ` · until ${formatDate(promo.endDate)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {promo.type === "percentage"
                        ? `${promo.value}%`
                        : promo.type === "bonus_points"
                          ? `${promo.value} pts`
                          : formatPrice(promo.value)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
