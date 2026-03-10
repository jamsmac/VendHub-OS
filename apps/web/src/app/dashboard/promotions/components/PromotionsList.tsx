"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Search, Tag, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PromotionCard } from "./PromotionCard";
import type { Promotion } from "./types";

interface PromotionsListProps {
  promotions: Promotion[];
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export function PromotionsList({
  promotions,
  onToggleStatus,
  onDelete,
}: PromotionsListProps) {
  const t = useTranslations("promotionsList");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "percent" | "fixed" | "special"
  >("all");
  const [selectedPromos, setSelectedPromos] = useState<Set<string>>(new Set());

  const filtered = promotions.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.promoCode.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? p.isActive : !p.isActive);
    const matchType = typeFilter === "all" || p.discountType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const togglePromoSelect = (id: string) => {
    const newSelected = new Set(selectedPromos);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPromos(newSelected);
  };

  const toggleAllPromos = () => {
    if (selectedPromos.size === filtered.length) {
      setSelectedPromos(new Set());
    } else {
      setSelectedPromos(new Set(filtered.map((p) => p.id)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-light" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((s) => (
            <Button
              key={s}
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={`${
                statusFilter === s
                  ? "bg-espresso text-white hover:bg-espresso-dark"
                  : "bg-espresso-50 text-espresso-light"
              }`}
            >
              {s === "all"
                ? t("filterAll")
                : s === "active"
                  ? t("filterActive")
                  : t("filterInactive")}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["all", "percent", "fixed", "special"] as const).map((type) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilter(type)}
              className={`${
                typeFilter === type
                  ? "bg-espresso text-white hover:bg-espresso-dark"
                  : "bg-espresso-50 text-espresso-light"
              }`}
            >
              {type === "all"
                ? t("allTypes")
                : type === "percent"
                  ? t("typePercent")
                  : type === "fixed"
                    ? t("typeFixed")
                    : t("typeSpecial")}
            </Button>
          ))}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedPromos.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedPromos.size === filtered.length}
                  onChange={toggleAllPromos}
                  className="rounded"
                />
                <span className="text-sm font-medium text-espresso-dark">
                  {t("selected", {
                    count: selectedPromos.size,
                    total: filtered.length,
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <Eye className="h-3.5 w-3.5" /> {t("activate")}
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <EyeOff className="h-3.5 w-3.5" /> {t("deactivate")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promotion cards */}
      <div className="space-y-3">
        {filtered.map((promo) => (
          <PromotionCard
            key={promo.id}
            promo={promo}
            isSelected={selectedPromos.has(promo.id)}
            onSelect={togglePromoSelect}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        ))}

        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-espresso/20 py-12 text-center">
            <Tag className="mx-auto h-8 w-8 text-espresso-light/40" />
            <p className="mt-2 text-sm text-espresso-light">{t("notFound")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
