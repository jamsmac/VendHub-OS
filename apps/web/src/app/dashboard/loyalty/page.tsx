"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Gift,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Ticket,
  Settings,
  Star,
  Trophy,
  Zap,
  Timer,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loyaltyApi } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface LoyaltyStats {
  period: { from: string; to: string };
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  levelDistribution: { level: string; count: number; percent: number }[];
  totalEarned: number;
  totalSpent: number;
  averageBalance: number;
  redemptionRate: number;
  topEarnSources: { source: string; total: number; percent: number }[];
  timeline: {
    date: string;
    earned: number;
    spent: number;
    newMembers: number;
  }[];
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  firstName: string;
  lastNameInitial: string;
  loyaltyLevel: string;
  pointsBalance: number;
  pointsEarned: number;
  currentStreak: number;
  avatarUrl: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const LEVEL_COLORS: Record<string, { bg: string; text: string; icon: string }> =
  {
    bronze: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-400",
      icon: "🥉",
    },
    silver: {
      bg: "bg-gray-100 dark:bg-gray-800/50",
      text: "text-gray-700 dark:text-gray-300",
      icon: "🥈",
    },
    gold: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-400",
      icon: "🥇",
    },
    platinum: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-700 dark:text-purple-400",
      icon: "💎",
    },
  };

const SOURCE_KEYS: Record<string, string> = {
  order_cashback: "sourceOrderCashback",
  welcome_bonus: "sourceWelcomeBonus",
  quest_reward: "sourceQuestReward",
  achievement_reward: "sourceAchievementReward",
  referral_bonus: "sourceReferralBonus",
  promo_code: "sourcePromoCode",
  admin_adjustment: "sourceAdminAdjustment",
  streak_bonus: "sourceStreakBonus",
};

interface SubPage {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SUB_PAGES: SubPage[] = [
  {
    key: "subTransactions",
    href: "/dashboard/loyalty/transactions",
    icon: TrendingUp,
  },
  {
    key: "subLevels",
    href: "/dashboard/loyalty/levels",
    icon: Star,
  },
  {
    key: "subAchievements",
    href: "/dashboard/loyalty/achievements",
    icon: Trophy,
  },
  {
    key: "subQuests",
    href: "/dashboard/loyalty/quests",
    icon: Target,
  },
  {
    key: "subPromoCodes",
    href: "/dashboard/loyalty/promo-codes",
    icon: Ticket,
  },
  {
    key: "subSettings",
    href: "/dashboard/loyalty/settings",
    icon: Settings,
  },
];

// ============================================================================
// Component
// ============================================================================

export default function LoyaltyDashboardPage() {
  const t = useTranslations("loyalty");
  const [statsPeriod, setStatsPeriod] = useState<string>("month");

  // Stats query
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["loyalty-stats", statsPeriod],
    queryFn: async () => {
      const now = new Date();
      const dateFrom = new Date();
      if (statsPeriod === "week") dateFrom.setDate(now.getDate() - 7);
      else if (statsPeriod === "month") dateFrom.setMonth(now.getMonth() - 1);
      else dateFrom.setFullYear(now.getFullYear() - 1);

      const res = await loyaltyApi.getStats({
        dateFrom: dateFrom.toISOString(),
        dateTo: now.toISOString(),
        groupBy:
          statsPeriod === "week"
            ? "day"
            : statsPeriod === "month"
              ? "week"
              : "month",
      });
      return res.data as LoyaltyStats;
    },
  });

  // Leaderboard
  const { data: leaderboardData } = useQuery({
    queryKey: ["loyalty-leaderboard"],
    queryFn: async () => {
      const res = await loyaltyApi.getLeaderboard({
        period: "month",
        limit: 10,
      });
      return res.data as { entries: LeaderboardEntry[]; myRank: number | null };
    },
  });

  // Expiring points
  const { data: expiringData } = useQuery({
    queryKey: ["loyalty-expiring"],
    queryFn: async () => {
      const res = await loyaltyApi.getExpiringPoints(30);
      return res.data;
    },
  });

  const stats = statsData;
  const leaderboard = leaderboardData?.entries || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Select value={statsPeriod} onValueChange={setStatsPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{t("periodWeek")}</SelectItem>
            <SelectItem value="month">{t("periodMonth")}</SelectItem>
            <SelectItem value="year">{t("periodYear")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("members")}</p>
                <p className="text-2xl font-bold">
                  {stats?.totalMembers?.toLocaleString() || "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.newMembers ? (
                    <span className="text-green-600 flex items-center gap-0.5">
                      <ArrowUpRight className="h-3 w-3" />+{stats.newMembers}{" "}
                      {t("newOnes")}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("pointsEarned")}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalEarned?.toLocaleString() || "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("activeCount", { count: stats?.activeMembers || 0 })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("pointsSpent")}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalSpent?.toLocaleString() || "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("redemption")}{" "}
                  {stats?.redemptionRate
                    ? `${stats.redemptionRate.toFixed(1)}%`
                    : "—"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("averageBalance")}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.averageBalance?.toLocaleString() || "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("pointsPerUser")}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Gift className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Two columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Level Distribution + Top Sources */}
        <div className="lg:col-span-2 space-y-6">
          {/* Level Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("levelDistribution")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-muted animate-pulse rounded"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(stats?.levelDistribution || []).map((level) => {
                    const config =
                      LEVEL_COLORS[level.level] || LEVEL_COLORS.bronze;
                    return (
                      <div
                        key={level.level}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xl w-8 text-center">
                          {config.icon}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize">
                              {level.level}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {level.count} ({level.percent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${config.bg.includes("orange") ? "bg-orange-500" : config.bg.includes("gray") ? "bg-gray-400" : config.bg.includes("yellow") ? "bg-yellow-500" : "bg-purple-500"}`}
                              style={{
                                width: `${Math.max(level.percent, 2)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Earn Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("earnSources")}</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-8 bg-muted animate-pulse rounded"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(stats?.topEarnSources || []).map((source) => (
                    <div
                      key={source.source}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <span className="text-sm">
                        {SOURCE_KEYS[source.source]
                          ? t(SOURCE_KEYS[source.source])
                          : source.source}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {source.total.toLocaleString()} {t("points")}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {source.percent.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(!stats?.topEarnSources ||
                    stats.topEarnSources.length === 0) && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {t("noDataForPeriod")}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expiring Points Alert */}
          {expiringData &&
            Array.isArray(expiringData) &&
            expiringData.length > 0 && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Timer className="h-5 w-5 text-orange-500" />
                    {t("expiringPoints")}
                  </CardTitle>
                  <CardDescription>
                    {t("expiringPointsDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {expiringData
                      .slice(0, 5)
                      .map(
                        (
                          item: {
                            firstName: string;
                            lastNameInitial: string;
                            expiringPoints?: number;
                          },
                          idx: number,
                        ) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                          >
                            <span className="text-sm">
                              {item.firstName} {item.lastNameInitial}.
                            </span>
                            <Badge variant="destructive">
                              {item.expiringPoints?.toLocaleString()}{" "}
                              {t("points")}
                            </Badge>
                          </div>
                        ),
                      )}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Right Column - Leaderboard + Quick Links */}
        <div className="space-y-6">
          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {t("topMonthly")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("noData")}
                  </p>
                ) : (
                  leaderboard.slice(0, 10).map((entry) => {
                    const levelConfig =
                      LEVEL_COLORS[entry.loyaltyLevel] || LEVEL_COLORS.bronze;
                    return (
                      <div
                        key={entry.userId}
                        className="flex items-center gap-3"
                      >
                        <span
                          className={`w-6 text-center font-bold text-sm ${entry.rank <= 3 ? "text-yellow-600" : "text-muted-foreground"}`}
                        >
                          {entry.rank <= 3
                            ? ["🥇", "🥈", "🥉"][entry.rank - 1]
                            : `#${entry.rank}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {entry.firstName} {entry.lastNameInitial}.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {levelConfig.icon}{" "}
                            {entry.pointsBalance.toLocaleString()} {t("points")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            +{entry.pointsEarned.toLocaleString()}
                          </p>
                          {entry.currentStreak > 0 && (
                            <p className="text-xs text-muted-foreground flex items-center gap-0.5 justify-end">
                              <Zap className="h-3 w-3" />
                              {t("streakDays", { count: entry.currentStreak })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
          {/* Quick Navigation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t("sections")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {SUB_PAGES.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <page.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {t(`${page.key}Name`)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t(`${page.key}Desc`)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
