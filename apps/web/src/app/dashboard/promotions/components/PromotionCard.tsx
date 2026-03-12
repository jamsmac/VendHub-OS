"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  DollarSign,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  MapPin,
  Percent,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Promotion } from "./types";
import { formatDate, formatNumber } from "@/lib/utils";

interface PromotionCardProps {
  promo: Promotion;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

// fmt is now imported as formatNumber from "@/lib/utils"
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

export function PromotionCard({
  promo,
  isSelected,
  onSelect,
  onToggleStatus,
  onDelete,
}: PromotionCardProps) {
  const t = useTranslations("promotions");
  const [isExpanded, setIsExpanded] = useState(false);

  const usagePercentage = promo.usageLimit
    ? (promo.usageCount / promo.usageLimit) * 100
    : 0;
  const timeProgress =
    promo.validFrom && promo.validUntil
      ? ((new Date().getTime() - new Date(promo.validFrom).getTime()) /
          (new Date(promo.validUntil).getTime() -
            new Date(promo.validFrom).getTime())) *
        100
      : 0;

  return (
    <Card
      className={`overflow-hidden ${isSelected ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className="flex">
        <div className={`w-2 bg-gradient-to-b ${promo.gradient}`} />

        <div className="flex items-center px-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(promo.id)}
            className="rounded"
          />
        </div>

        <div className="flex items-center px-2 text-espresso-light/40 hover:text-espresso-light">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 p-4">
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-espresso-dark">
                    {promo.title}
                  </h3>
                  <Badge variant={promo.isActive ? "success" : "outline"}>
                    {promo.isActive ? t("cardActive") : t("cardInactive")}
                  </Badge>
                  {promo.visibilityType === "action_required" && (
                    <Badge variant="destructive">
                      {t("cardActionRequired")}
                    </Badge>
                  )}
                  {promo.geographicRestriction === "specific" && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" /> {t("cardRestricted")}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-espresso-light">
                  {promo.description}
                </p>

                {/* Usage progress bar */}
                {promo.usageLimit && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-espresso-light">
                        {t("cardUsed")}
                      </span>
                      <span className="font-medium text-espresso-dark">
                        {promo.usageCount} / {promo.usageLimit}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-espresso-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Time progress bar */}
                {promo.validFrom && promo.validUntil && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-espresso-light">
                        {t("cardTimeProgress")}
                      </span>
                      <span className="font-medium text-espresso-dark">
                        {Math.min(Math.max(timeProgress, 0), 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-espresso-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{
                          width: `${Math.min(Math.max(timeProgress, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Affected products chips */}
                {promo.affectedProducts &&
                  promo.affectedProducts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {promo.affectedProducts.slice(0, 2).map((product) => (
                        <Badge
                          key={product}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {product}
                        </Badge>
                      ))}
                      {promo.affectedProducts.length > 2 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{promo.affectedProducts.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {promo.promoCode && (
                <code className="rounded bg-espresso-50 px-2.5 py-1 font-mono text-xs font-semibold text-espresso-dark">
                  {promo.promoCode}
                </code>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Metrics row */}
          <div className="mt-3 flex items-center gap-6 text-xs flex-wrap">
            <span className="flex items-center gap-1 text-espresso-light">
              {promo.discountType === "percent" ? (
                <Percent className="h-3 w-3" />
              ) : promo.discountType === "fixed" ? (
                <DollarSign className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span className="font-medium text-espresso-dark">
                {promo.discountType === "percent"
                  ? `${promo.discountValue}%`
                  : promo.discountType === "fixed"
                    ? `${formatNumber(promo.discountValue)} UZS`
                    : t("cardSpecial")}
              </span>
            </span>
            <span className="text-espresso-light">
              <span className="font-medium text-espresso-dark">
                {promo.usageCount}
              </span>{" "}
              {t("cardUsages")}
            </span>
            <span className="text-espresso-light">
              <span className="font-medium text-espresso-dark">
                {promo.uniqueUsers}
              </span>{" "}
              {t("cardUniques")}
            </span>
            <span className="text-espresso-light">
              {t("cardRevenue")}{" "}
              <span className="font-medium text-emerald-600">
                +{fmtShort(promo.revenueImpact)}
              </span>
            </span>
            {promo.validUntil && (
              <span className="flex items-center gap-1 text-espresso-light">
                <Calendar className="h-3 w-3" />
                {t("cardUntil")} {formatDate(promo.validUntil)}
              </span>
            )}
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-espresso/10 pt-4 lg:grid-cols-4">
              {/* Conditions */}
              <div>
                <p className="text-xs font-medium text-espresso-dark mb-2">
                  {t("cardConditions")}
                </p>
                <div className="space-y-1">
                  {promo.conditions.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-espresso-light"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-espresso-light/40" />
                      {c}
                    </div>
                  ))}
                </div>
                {promo.actionInstruction && (
                  <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    💡 {promo.actionInstruction}
                  </div>
                )}
              </div>

              {/* Schedule */}
              {promo.schedule && (
                <div>
                  <p className="text-xs font-medium text-espresso-dark mb-2">
                    {`📅 ${t("cardSchedule")}`}
                  </p>
                  {promo.schedule.startHour !== undefined &&
                    promo.schedule.endHour !== undefined && (
                      <div className="text-xs text-espresso-light space-y-1">
                        <p>
                          {`⏰ ${t("cardTime")}`} {promo.schedule.startHour}:00
                          — {promo.schedule.endHour}:00
                        </p>
                      </div>
                    )}
                  {promo.schedule.daysOfWeek && (
                    <div className="mt-1 text-xs text-espresso-light">
                      <p>{`📆 ${t("cardDays")}`}</p>
                      <div className="flex gap-1 mt-0.5">
                        {[
                          t("dayMon"),
                          t("dayTue"),
                          t("dayWed"),
                          t("dayThu"),
                          t("dayFri"),
                          t("daySat"),
                          t("daySun"),
                        ].map((day, idx) => (
                          <span
                            key={day}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              promo.schedule!.daysOfWeek!.includes(idx)
                                ? "bg-espresso-dark text-white"
                                : "bg-espresso-50 text-espresso-light"
                            }`}
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Audience */}
              {promo.audience && (
                <div>
                  <p className="text-xs font-medium text-espresso-dark mb-2">
                    {`👥 ${t("cardAudience")}`}
                  </p>
                  <div className="space-y-1 text-xs text-espresso-light">
                    {promo.audience.minLevel && (
                      <p>
                        {t("cardMinLevel")}{" "}
                        <span className="font-medium">
                          {promo.audience.minLevel}
                        </span>
                      </p>
                    )}
                    {promo.audience.segment && (
                      <p>
                        {t("cardSegment")}{" "}
                        <span className="font-medium">
                          {promo.audience.segment === "students"
                            ? t("cardStudents")
                            : t("cardAll")}
                        </span>
                      </p>
                    )}
                    {promo.audience.device && (
                      <p>
                        {t("cardDevice")}{" "}
                        <span className="font-medium">
                          {promo.audience.device}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Preview card */}
              <div>
                <p className="text-xs font-medium text-espresso-dark mb-2">
                  {t("cardPreview")}
                </p>
                <div
                  className={`rounded-xl bg-gradient-to-r ${promo.gradient} p-4 text-white`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {promo.badge}
                  </p>
                  <p className="mt-1 text-sm font-bold">{promo.title}</p>
                  <p className="mt-0.5 text-xs opacity-80 line-clamp-2">
                    {promo.description}
                  </p>
                  {promo.promoCode && (
                    <div className="mt-2 inline-block rounded-lg bg-white/20 px-2 py-0.5 font-mono text-xs font-bold">
                      {promo.promoCode}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div>
                <p className="text-xs font-medium text-espresso-dark mb-2">
                  {t("cardActions")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Edit2 className="h-3.5 w-3.5" /> {t("cardEdit")}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Copy className="h-3.5 w-3.5" /> {t("cardDuplicate")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => onToggleStatus(promo.id, !promo.isActive)}
                  >
                    {promo.isActive ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> {t("cardDeactivate")}
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> {t("cardActivate")}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-red-500 hover:text-red-700"
                    onClick={() => {
                      if (confirm(t("cardDeleteConfirm"))) {
                        onDelete(promo.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("cardDelete")}
                  </Button>
                </div>
                <div className="mt-3 text-[11px] text-espresso-light">
                  {t("cardCreated")} {formatDate(promo.createdAt)} ·{" "}
                  {t("cardOrder")} #{promo.sortOrder}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
