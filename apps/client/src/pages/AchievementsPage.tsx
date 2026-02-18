import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Gift, CheckCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { achievementsApi, UserAchievement } from "../lib/api";

const RARITY_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  common: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-600",
  },
  uncommon: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-600",
  },
  rare: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600" },
  epic: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-600",
  },
  legendary: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-600",
  },
};

const _CATEGORY_LABELS: Record<string, string> = {
  beginner: "Новичок",
  explorer: "Исследователь",
  loyal: "Лояльный",
  social: "Социальный",
  collector: "Коллекционер",
  special: "Специальный",
};

export function AchievementsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: myData, isLoading } = useQuery({
    queryKey: ["my-achievements"],
    queryFn: () => achievementsApi.getMyAll().then((r) => r.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ["achievements-summary"],
    queryFn: () => achievementsApi.getMy().then((r) => r.data),
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => achievementsApi.claim(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-achievements"] }),
  });

  const claimAllMutation = useMutation({
    mutationFn: () => achievementsApi.claimAll(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-achievements"] }),
  });

  const achievements = (myData || []).filter((a: UserAchievement) =>
    filter === "all"
      ? true
      : filter === "unlocked"
        ? a.isUnlocked
        : filter === "locked"
          ? !a.isUnlocked
          : true,
  );

  const unclaimedCount = (myData || []).filter(
    (a: UserAchievement) => a.isUnlocked && !a.isClaimed,
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Достижения</h1>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold">{summaryData?.total || 0}</p>
            <p className="text-xs opacity-90">Всего</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold">{summaryData?.unlocked || 0}</p>
            <p className="text-xs opacity-90">Открыто</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold">{summaryData?.claimed || 0}</p>
            <p className="text-xs opacity-90">Получено</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4 pb-24">
        {/* Claim All */}
        {unclaimedCount > 0 && (
          <button
            onClick={() => claimAllMutation.mutate()}
            disabled={claimAllMutation.isPending}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
          >
            <Gift className="h-5 w-5" />
            Забрать все награды ({unclaimedCount})
          </button>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: "Все" },
            { key: "unlocked", label: "Открытые" },
            { key: "locked", label: "Закрытые" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === f.key
                  ? "bg-yellow-500 text-white"
                  : "bg-white text-gray-600 border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Achievements List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {achievements.map((ua: UserAchievement) => {
              const ach = ua.achievement;
              const rarity = RARITY_COLORS[ach.rarity] || RARITY_COLORS.common;
              const progress = Math.min(
                (ua.progress / ach.conditionValue) * 100,
                100,
              );

              return (
                <div
                  key={ua.id}
                  className={`bg-white rounded-xl p-4 border ${rarity.border} ${!ua.isUnlocked ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`text-3xl ${ua.isUnlocked ? "" : "grayscale"}`}
                    >
                      {ach.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{ach.title}</h3>
                        {ua.isUnlocked && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {!ua.isUnlocked && (
                          <Lock className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ach.description}
                      </p>

                      {/* Progress */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">
                            {ua.progress}/{ach.conditionValue}
                          </span>
                          <span className={`font-medium ${rarity.text}`}>
                            🎁 {ach.pointsReward} баллов
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${ua.isUnlocked ? "bg-green-500" : "bg-yellow-400"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Claim button */}
                      {ua.isUnlocked && !ua.isClaimed && (
                        <button
                          onClick={() => claimMutation.mutate(ua.id)}
                          disabled={claimMutation.isPending}
                          className="mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded-lg font-medium flex items-center gap-1"
                        >
                          <Gift className="h-3 w-3" />
                          Забрать награду
                        </button>
                      )}
                      {ua.isClaimed && (
                        <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Награда получена
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
