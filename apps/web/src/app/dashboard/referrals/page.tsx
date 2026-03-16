"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Users, TrendingUp, Gift } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface ReferralStats {
  totalReferrals: number;
  totalEarned: number;
  activeReferrers: number;
  topReferrers?: Array<{
    userId: string;
    name: string;
    referralCount: number;
    totalEarned: number;
  }>;
}

export default function ReferralsPage() {
  const t = useTranslations("referrals");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const res = await api.get("/referrals/stats");
      return (res.data ?? {}) as ReferralStats;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalReferrals") || "Total Referrals"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalReferrals ?? "—"}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalEarned") || "Total Earned"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalEarned ? formatPrice(stats.totalEarned) : "—"}
                </p>
              </div>
              <Gift className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("activeReferrers") || "Active Referrers"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.activeReferrers ?? "—"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("topReferrers") || "Top Referrers"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.topReferrers?.length ? (
            <div className="space-y-3">
              {stats.topReferrers.map((r, i) => (
                <div
                  key={r.userId}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {i + 1}. {r.name}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {r.referralCount} referrals
                    </span>
                    <span className="font-medium">
                      {formatPrice(r.totalEarned)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">
              {t("noData") || "No referral data yet"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
