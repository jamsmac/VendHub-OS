"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Download, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { Coupon } from "./types";
import { formatDate } from "@/lib/utils";

interface PromotionsCouponsProps {
  couponStats: {
    totalIssued: number;
    totalUsed: number;
    activeRate: number;
    totalExpired: number;
  };
  coupons: Coupon[];
}

export function PromotionsCoupons({
  couponStats,
  coupons,
}: PromotionsCouponsProps) {
  const t = useTranslations("promotions");
  const [couponFilter, setCouponFilter] = useState<
    "all" | "active" | "used" | "expired"
  >("all");

  const filteredCoupons = coupons.filter((c) => {
    if (couponFilter === "all") return true;
    return c.status === couponFilter;
  });

  return (
    <>
      {/* Coupon stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t("couponIssued"),
            value: couponStats.totalIssued,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: t("couponUsed"),
            value: couponStats.totalUsed,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: t("couponActive"),
            value: couponStats.activeRate + "%",
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: t("couponExpired"),
            value: couponStats.totalExpired,
            color: "text-red-600",
            bg: "bg-red-50",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-sm text-espresso-light">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-espresso-dark font-display">
                {stat.value}
              </p>
              <div className={`rounded-lg ${stat.bg} mt-3 h-2`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coupon generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("couponGenerator")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-espresso-dark mb-2">
                {t("couponPrefix")}
              </label>
              <Input placeholder={t("couponPrefixPlaceholder")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso-dark mb-2">
                {t("couponQuantity")}
              </label>
              <Input type="number" placeholder="100" defaultValue="100" />
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-2 bg-espresso hover:bg-espresso-dark">
                <Sparkles className="h-4 w-4" /> {t("couponGenerate")}
              </Button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              {t("couponGenerateHint")}{" "}
              <code className="font-mono font-semibold">MORNING_XXXXXX</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Coupons list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("couponList")}</CardTitle>
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="h-3.5 w-3.5" /> {t("export")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {(["all", "active", "used", "expired"] as const).map((f) => (
              <Button
                key={f}
                variant="ghost"
                size="sm"
                onClick={() => setCouponFilter(f)}
                className={`${
                  couponFilter === f
                    ? "bg-espresso text-white hover:bg-espresso-dark"
                    : "bg-espresso-50 text-espresso-light"
                }`}
              >
                {f === "all"
                  ? t("couponFilterAll")
                  : f === "active"
                    ? t("couponFilterActive")
                    : f === "used"
                      ? t("couponFilterUsed")
                      : t("couponFilterExpired")}
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-espresso/10">
                  <TableHead className="text-left py-3 px-4 font-semibold text-espresso-dark">
                    {t("couponColCode")}
                  </TableHead>
                  <TableHead className="text-left py-3 px-4 font-semibold text-espresso-dark">
                    {t("couponColStatus")}
                  </TableHead>
                  <TableHead className="text-left py-3 px-4 font-semibold text-espresso-dark">
                    {t("couponColCreated")}
                  </TableHead>
                  <TableHead className="text-left py-3 px-4 font-semibold text-espresso-dark">
                    {t("couponColUsed")}
                  </TableHead>
                  <TableHead className="text-right py-3 px-4 font-semibold text-espresso-dark">
                    {t("couponColActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoupons.map((coupon) => (
                  <TableRow
                    key={coupon.id}
                    className="border-b border-espresso/10 hover:bg-espresso-50"
                  >
                    <TableCell className="py-3 px-4">
                      <code className="font-mono font-semibold text-espresso-dark">
                        {coupon.code}
                      </code>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {coupon.status === "active" && (
                        <Badge variant="success">
                          {t("couponStatusActive")}
                        </Badge>
                      )}
                      {coupon.status === "used" && (
                        <Badge variant="default">{t("couponStatusUsed")}</Badge>
                      )}
                      {coupon.status === "expired" && (
                        <Badge variant="outline">
                          {t("couponStatusExpired")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-espresso-light text-xs">
                      {formatDate(coupon.createdAt)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-espresso-light text-xs">
                      {coupon.usedAt ? formatDate(coupon.usedAt) : "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Copy className="h-3.5 w-3.5" /> {t("couponCopy")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
