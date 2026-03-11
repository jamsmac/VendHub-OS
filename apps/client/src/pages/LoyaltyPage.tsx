/**
 * Loyalty Page
 * User loyalty program - points, levels, rewards
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Star,
  Gift,
  Trophy,
  Coins,
  Zap,
  Crown,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Lock,
  ChevronRight,
  Medal,
  Flame,
  Target,
  Users,
  TicketPercent,
} from "lucide-react";
import { api, UserAchievement } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

interface LeaderboardUser {
  id: string;
  name?: string;
  username?: string;
  points: number;
}

interface LoyaltyData {
  points: number;
  lifetimePoints: number;
  tier: {
    id: string;
    name: string;
    level: number;
    minPoints: number;
    maxPoints: number;
    cashbackPercent: number;
    bonusMultiplier: number;
    color: string;
  };
  nextTier: {
    id: string;
    name: string;
    minPoints: number;
    cashbackPercent: number;
  } | null;
  pointsToNextTier: number;
  progressPercent: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: "discount" | "product" | "cashback" | "special";
  imageUrl?: string;
  isAvailable: boolean;
  expiresAt?: string;
}

interface PointsHistory {
  id: string;
  points: number;
  type: "earn" | "spend" | "expire" | "bonus";
  description: string;
  createdAt: string;
}

const tierIcons: Record<number, typeof Star> = {
  1: Star,
  2: Zap,
  3: Trophy,
  4: Crown,
};

const tierColors: Record<number, string> = {
  1: "from-gray-400 to-gray-500",
  2: "from-blue-400 to-blue-600",
  3: "from-yellow-400 to-amber-500",
  4: "from-purple-400 to-purple-600",
};

export function LoyaltyPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"rewards" | "history">("rewards");

  // Fetch loyalty data
  const { data: loyalty, isLoading: loyaltyLoading } = useQuery<LoyaltyData>({
    queryKey: ["loyalty"],
    queryFn: async () => {
      const res = await api.get("/loyalty/me");
      return res.data;
    },
  });

  // Fetch available rewards
  const { data: rewards } = useQuery<Reward[]>({
    queryKey: ["loyalty", "rewards"],
    queryFn: async () => {
      const res = await api.get("/loyalty/rewards");
      return res.data;
    },
  });

  // Fetch points history
  const { data: history } = useQuery<PointsHistory[]>({
    queryKey: ["loyalty", "history"],
    queryFn: async () => {
      const res = await api.get("/loyalty/history");
      return res.data;
    },
    enabled: activeTab === "history",
  });

  const TierIcon = loyalty ? tierIcons[loyalty.tier.level] || Star : Star;
  const tierGradient = loyalty
    ? tierColors[loyalty.tier.level] || tierColors[1]
    : tierColors[1];

  if (loyaltyLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">{t("bonuses")}</h1>
        </div>
        <div className="h-48 rounded-3xl bg-muted animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{t("bonusProgram")}</h1>
      </div>

      {/* Points Card */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tierGradient} p-6 text-white`}
      >
        <div className="relative z-10">
          {/* Tier Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-4">
            <TierIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {loyalty?.tier.name || t("tierBasic")}
            </span>
          </div>

          {/* Points Balance */}
          <div className="mb-6">
            <p className="text-white/80 text-sm mb-1">{t("yourPoints")}</p>
            <p className="text-4xl font-bold">
              {formatNumber(loyalty?.points || 0)}
              <span className="text-lg ml-1 font-normal text-white/80">
                {t("pointsLabel")}
              </span>
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex gap-6 mb-6">
            <div>
              <p className="text-white/60 text-xs">{t("cashback")}</p>
              <p className="text-lg font-semibold">
                {loyalty?.tier.cashbackPercent || 1}%
              </p>
            </div>
            <div>
              <p className="text-white/60 text-xs">{t("multiplier")}</p>
              <p className="text-lg font-semibold">
                x{loyalty?.tier.bonusMultiplier || 1}
              </p>
            </div>
            <div>
              <p className="text-white/60 text-xs">{t("totalEarned")}</p>
              <p className="text-lg font-semibold">
                {formatNumber(loyalty?.lifetimePoints || 0)}
              </p>
            </div>
          </div>

          {/* Progress to Next Tier */}
          {loyalty?.nextTier && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/80">
                  {t("toLevel", { name: loyalty.nextTier.name })}
                </span>
                <span className="font-medium">
                  {t("pointsRemaining", {
                    count: Number(loyalty.pointsToNextTier),
                  })}
                </span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${loyalty.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Decorative Elements */}
        <Sparkles className="absolute right-4 top-4 w-20 h-20 text-white/10" />
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/quests"
          className="card-coffee p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="font-medium text-sm">{t("quests")}</p>
            <p className="text-xs text-muted-foreground">{t("earnPoints")}</p>
          </div>
        </Link>
        <Link
          to="/referrals"
          className="card-coffee p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="font-medium text-sm">{t("friends")}</p>
            <p className="text-xs text-muted-foreground">{t("invite")}</p>
          </div>
        </Link>
        <Link
          to="/achievements"
          className="card-coffee p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Medal className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="font-medium text-sm">{t("loyaltyAchievements")}</p>
            <p className="text-xs text-muted-foreground">
              {t("loyaltyMedals")}
            </p>
          </div>
        </Link>
        <Link
          to="/promo-code"
          className="card-coffee p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <TicketPercent className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="font-medium text-sm">{t("loyaltyPromoCode")}</p>
            <p className="text-xs text-muted-foreground">
              {t("loyaltyEnterCode")}
            </p>
          </div>
        </Link>
      </div>

      {/* Streak Card */}
      <StreakCard />

      {/* Daily Quests Preview */}
      <DailyQuestsPreview />

      {/* Leaderboard Preview */}
      <LeaderboardPreview />

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveTab("rewards")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "rewards"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("rewards")}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("history")}
        </button>
      </div>

      {/* Rewards Tab */}
      {activeTab === "rewards" && (
        <div className="space-y-3">
          {rewards?.map((reward) => {
            const canRedeem =
              (loyalty?.points || 0) >= reward.pointsCost && reward.isAvailable;

            return (
              <div
                key={reward.id}
                className={`card-coffee p-4 ${!canRedeem ? "opacity-60" : ""}`}
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {reward.type === "discount" && (
                      <Coins className="w-8 h-8 text-primary" />
                    )}
                    {reward.type === "product" && (
                      <Gift className="w-8 h-8 text-primary" />
                    )}
                    {reward.type === "cashback" && (
                      <TrendingUp className="w-8 h-8 text-primary" />
                    )}
                    {reward.type === "special" && (
                      <Sparkles className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{reward.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {reward.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-primary font-semibold">
                        <Star className="w-4 h-4" />
                        {formatNumber(reward.pointsCost)}
                      </div>
                      {canRedeem ? (
                        <button className="text-sm bg-primary text-white px-4 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                          {t("redeem")}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Lock className="w-4 h-4" />
                          {t("unavailable")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!rewards?.length && (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t("noRewardsAvailable")}</p>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {history?.map((item) => (
            <div key={item.id} className="card-coffee p-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.type === "earn" || item.type === "bonus"
                      ? "bg-green-500/10"
                      : item.type === "spend"
                        ? "bg-blue-500/10"
                        : "bg-red-500/10"
                  }`}
                >
                  {item.type === "earn" && (
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  )}
                  {item.type === "bonus" && (
                    <Sparkles className="w-5 h-5 text-green-500" />
                  )}
                  {item.type === "spend" && (
                    <Gift className="w-5 h-5 text-blue-500" />
                  )}
                  {item.type === "expire" && (
                    <Clock className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div
                  className={`font-semibold ${
                    item.points > 0 ? "text-green-500" : "text-muted-foreground"
                  }`}
                >
                  {item.points > 0 ? "+" : ""}
                  {formatNumber(item.points)}
                </div>
              </div>
            </div>
          ))}

          {!history?.length && (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t("historyEmpty")}</p>
              <p className="text-sm mt-1">{t("makePurchaseToEarnPoints")}</p>
            </div>
          )}
        </div>
      )}

      {/* Achievements Preview */}
      <AchievementsPreview />

      {/* Tier Info */}
      <div className="card-coffee p-4">
        <h3 className="font-semibold mb-4">{t("programLevels")}</h3>
        <div className="space-y-3">
          {[
            { level: 1, nameKey: "tierBasic", min: 0, cashback: 1 },
            { level: 2, nameKey: "tierSilver", min: 1000, cashback: 2 },
            { level: 3, nameKey: "tierGold", min: 5000, cashback: 5 },
            { level: 4, nameKey: "tierPlatinum", min: 15000, cashback: 10 },
          ].map((tier) => {
            const isCurrentTier = loyalty?.tier.level === tier.level;
            const isUnlocked = (loyalty?.lifetimePoints || 0) >= tier.min;
            const Icon = tierIcons[tier.level];

            return (
              <div
                key={tier.level}
                className={`flex items-center gap-4 p-3 rounded-xl ${
                  isCurrentTier ? "bg-primary/10 border border-primary/20" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${tierColors[tier.level]}`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t(tier.nameKey)}</span>
                    {isCurrentTier && (
                      <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                        {t("yourLevel")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("fromPoints", { count: Number(tier.min) })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{tier.cashback}%</p>
                  <p className="text-xs text-muted-foreground">
                    {t("cashback")}
                  </p>
                </div>
                {isUnlocked ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Streak visual component */
function StreakCard() {
  const { t } = useTranslation();
  const { data: streak } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const res = await api.get("/quests/streak");
      return res.data as {
        currentStreak: number;
        longestStreak: number;
        lastOrderDate: string | null;
      };
    },
  });

  const days = t("loyaltyDays").split(",");
  const currentDay = new Date().getDay(); // 0=Sun
  const dayIndex = currentDay === 0 ? 6 : currentDay - 1;

  return (
    <div className="card-coffee p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-sm">{t("loyaltyStreak")}</h3>
        </div>
        <span className="text-lg font-bold text-orange-500">
          {streak?.currentStreak || 0}
        </span>
      </div>
      <div className="flex gap-1.5">
        {days.map((day, idx) => (
          <div key={day} className="flex-1 text-center">
            <div
              className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                idx <= dayIndex && idx < (streak?.currentStreak || 0)
                  ? "bg-orange-500 text-white"
                  : idx === dayIndex
                    ? "bg-orange-100 text-orange-600 border-2 border-orange-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {idx < (streak?.currentStreak || 0) ? "\u2713" : day}
            </div>
          </div>
        ))}
      </div>
      {(streak?.currentStreak || 0) >= 7 && (
        <p className="text-xs text-green-600 mt-2 text-center font-medium">
          {t("loyaltyStreakBonus")}
        </p>
      )}
    </div>
  );
}

/** Daily quests preview */
function DailyQuestsPreview() {
  const { t } = useTranslation();
  const { data: quests } = useQuery({
    queryKey: ["daily-quests"],
    queryFn: async () => {
      const res = await api.get("/quests");

      interface Quest {
        id: string;
        title: string;
        period: string;
        progress: number;
        target: number;
        reward: number;
      }
      const data = res.data as Quest[];
      return data.filter((q) => q.period === "daily").slice(0, 3);
    },
  });

  if (!quests?.length) return null;

  return (
    <div className="card-coffee p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-sm">{t("loyaltyDailyQuests")}</h3>
        </div>
        <Link
          to="/quests"
          className="text-xs text-primary font-medium flex items-center gap-1"
        >
          {t("loyaltyAllQuests")} <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {quests.map((quest) => {
          const pct =
            quest.target > 0
              ? Math.min(100, (quest.progress / quest.target) * 100)
              : 0;
          return (
            <div key={quest.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{quest.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {quest.progress}/{quest.target}
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                +{quest.reward}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Leaderboard preview - top 5 */
function LeaderboardPreview() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["leaderboard-preview"],
    queryFn: async () => {
      const res = await api.get("/loyalty/leaderboard", {
        params: { limit: 5 },
      });
      return res.data as { items: LeaderboardUser[]; myRank?: number };
    },
  });

  if (!data?.items?.length) return null;

  return (
    <div className="card-coffee p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-sm">{t("loyaltyLeaderboard")}</h3>
        </div>
        {data.myRank && (
          <span className="text-xs text-muted-foreground">
            {t("loyaltyYourRank", { rank: data.myRank })}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {data.items.map((user, idx) => (
          <div key={user.id || idx} className="flex items-center gap-3">
            <span
              className={`w-6 text-center font-bold text-sm ${
                idx === 0
                  ? "text-yellow-500"
                  : idx === 1
                    ? "text-gray-400"
                    : idx === 2
                      ? "text-orange-400"
                      : "text-muted-foreground"
              }`}
            >
              {idx === 0
                ? "🥇"
                : idx === 1
                  ? "🥈"
                  : idx === 2
                    ? "🥉"
                    : `${idx + 1}`}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {(user.name || user.username || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.name || user.username || t("loyaltyUser")}
              </p>
            </div>
            <span className="text-sm font-semibold">
              {formatNumber(user.points || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Achievements preview - recent unlocked */
function AchievementsPreview() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["achievements-preview"],
    queryFn: async () => {
      const res = await api.get("/achievements/my");

      return res.data as {
        total: number;
        unlocked: number;
        achievements: UserAchievement[];
      };
    },
  });

  if (!data) return null;

  const recentUnlocked =
    data.achievements?.filter((a) => a.isUnlocked)?.slice(0, 4) || [];

  return (
    <div className="card-coffee p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-sm">{t("loyaltyAchievements")}</h3>
        </div>
        <Link
          to="/achievements"
          className="text-xs text-primary font-medium flex items-center gap-1"
        >
          {data.unlocked}/{data.total} <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {recentUnlocked.length > 0 ? (
        <div className="flex gap-3">
          {recentUnlocked.map((ua) => (
            <div key={ua.id} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
                {ua.achievement?.icon || "🏆"}
              </div>
              <span className="text-[10px] text-muted-foreground text-center line-clamp-1 w-14">
                {ua.achievement?.title || t("loyaltyMedal")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("loyaltyMakePurchases")}
        </p>
      )}
    </div>
  );
}
