"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  TrendingUp,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loyaltyApi, usersApi } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface _PointsTransaction {
  id: string;
  type: "earn" | "spend" | "expire" | "adjust";
  amount: number;
  balanceAfter: number;
  source: string;
  description: string;
  createdAt: string;
  expiresAt: string | null;
  icon: string;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

const SOURCE_KEYS = [
  "order_cashback",
  "welcome_bonus",
  "quest_reward",
  "achievement_reward",
  "referral_bonus",
  "promo_code",
  "admin_adjustment",
  "streak_bonus",
  "points_expiry",
  "order_payment",
] as const;

// ============================================================================
// Component
// ============================================================================

export default function LoyaltyTransactionsPage() {
  const t = useTranslations("loyaltyTransactions");
  const queryClient = useQueryClient();
  const [_typeFilter, _setTypeFilter] = useState<string>("all");
  const [_sourceFilter, _setSourceFilter] = useState<string>("all");
  const [_page, _setPage] = useState(1);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    userId: "",
    amount: 0,
    reason: "",
  });

  // Fetch transactions (admin stats view)
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["loyalty-stats-overview"],
    queryFn: async () => {
      const now = new Date();
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      const res = await loyaltyApi.getStats({
        dateFrom: monthAgo.toISOString(),
        dateTo: now.toISOString(),
      });
      return res.data;
    },
  });

  // Fetch users for adjust dialog
  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await usersApi.getAll();
      return res.data;
    },
    enabled: showAdjustDialog,
  });

  // Adjust points mutation
  const adjustMutation = useMutation({
    mutationFn: (data: { userId: string; amount: number; reason: string }) =>
      loyaltyApi.adjustPoints(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-stats"] });
      setShowAdjustDialog(false);
      setAdjustForm({ userId: "", amount: 0, reason: "" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/loyalty">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Button onClick={() => setShowAdjustDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("adjustBtn")}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statEarned")}
                </p>
                <p className="text-xl font-bold">
                  {statsData?.totalEarned?.toLocaleString() || "\u2014"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statSpent")}
                </p>
                <p className="text-xl font-bold">
                  {statsData?.totalSpent?.toLocaleString() || "\u2014"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statAvgBalance")}
                </p>
                <p className="text-xl font-bold">
                  {statsData?.averageBalance?.toLocaleString() || "\u2014"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statRedemptionRate")}
                </p>
                <p className="text-xl font-bold">
                  {statsData?.redemptionRate
                    ? `${statsData.redemptionRate.toFixed(1)}%`
                    : "\u2014"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("timelineTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {statsData?.timeline && statsData.timeline.length > 0 ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {statsData.timeline.map((item: any) => (
                <div
                  key={item.date}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm text-muted-foreground">
                    {new Date(item.date).toLocaleDateString("ru-RU")}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-green-600">
                      +{item.earned.toLocaleString()}
                    </span>
                    <span className="text-sm text-red-600">
                      -{item.spent.toLocaleString()}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {t("newMembers", { count: item.newMembers })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              {statsLoading ? t("loading") : t("noDataForPeriod")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("sourcesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(statsData?.topEarnSources || []).map((source: any) => (
              <div
                key={source.source}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {SOURCE_KEYS.includes(source.source)
                      ? t(`source_${source.source}`)
                      : source.source}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {source.total.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {source.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Adjust Points Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adjustTitle")}</DialogTitle>
            <DialogDescription>{t("adjustDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("labelUser")}</Label>
              <Select
                value={adjustForm.userId}
                onValueChange={(v) =>
                  setAdjustForm({ ...adjustForm, userId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectUserPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(usersData)
                    ? usersData
                    : usersData?.data || []
                  )
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("labelPoints")}</Label>
              <Input
                type="number"
                value={adjustForm.amount}
                onChange={(e) =>
                  setAdjustForm({
                    ...adjustForm,
                    amount: Number(e.target.value),
                  })
                }
                placeholder={t("pointsPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("pointsHint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("labelReason")}</Label>
              <Textarea
                value={adjustForm.reason}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, reason: e.target.value })
                }
                placeholder={t("reasonPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdjustDialog(false)}
            >
              {t("cancelBtn")}
            </Button>
            <Button
              onClick={() => adjustMutation.mutate(adjustForm)}
              disabled={
                !adjustForm.userId ||
                !adjustForm.amount ||
                !adjustForm.reason ||
                adjustMutation.isPending
              }
            >
              {adjustMutation.isPending ? t("saving") : t("applyBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
