"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Trophy, Search, Lock, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface Achievement {
  id: string;
  title: string;
  titleUz?: string;
  description: string;
  icon: string;
  category: string;
  conditionType: string;
  conditionValue: number;
  pointsReward: number;
  rarity: string;
  isActive: boolean;
  unlockedCount?: number;
}

const rarityColors: Record<string, string> = {
  common: "text-gray-600 bg-gray-100",
  uncommon: "text-green-600 bg-green-100",
  rare: "text-blue-600 bg-blue-100",
  epic: "text-purple-600 bg-purple-100",
  legendary: "text-amber-600 bg-amber-100",
};

export default function AchievementsPage() {
  const t = useTranslations("achievements");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["admin-achievements", categoryFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (categoryFilter !== "all") params.category = categoryFilter;
      const res = await api.get("/achievements", { params });
      return (res.data?.data ||
        res.data?.items ||
        res.data ||
        []) as Achievement[];
    },
    staleTime: 60_000,
  });

  const categories = useMemo(() => {
    if (!achievements) return [];
    return [...new Set(achievements.map((a) => a.category))];
  }, [achievements]);

  const filtered = useMemo(() => {
    if (!achievements) return [];
    if (!search) return achievements;
    const q = search.toLowerCase();
    return achievements.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }, [achievements, search]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{achievements?.length ?? "—"}</p>
            <p className="text-sm text-muted-foreground">
              {t("total") || "Total"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {achievements?.filter((a) => a.isActive).length ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("active") || "Active"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {categories.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("categories") || "Categories"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tCommon("search") || "Search..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
          >
            {tCommon("all") || "All"}
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              variant={categoryFilter === c ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{t("noAchievements") || "No achievements found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((achievement) => (
            <Card
              key={achievement.id}
              className="hover:shadow-sm transition-shadow"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{achievement.icon || "🏆"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">
                        {achievement.title}
                      </h3>
                      {!achievement.isActive && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {achievement.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${rarityColors[achievement.rarity] || rarityColors.common}`}
                      >
                        {achievement.rarity}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        {achievement.pointsReward} pts
                      </span>
                    </div>
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
