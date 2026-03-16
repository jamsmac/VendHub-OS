"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Target, Search, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface Quest {
  id: string;
  title: string;
  titleUz?: string;
  description: string;
  type: string;
  period: string;
  difficulty: string;
  reward: number;
  targetValue: number;
  isActive: boolean;
  participantsCount?: number;
  completionsCount?: number;
  expiresAt?: string;
}

const difficultyColors: Record<string, string> = {
  easy: "text-green-600 bg-green-100",
  medium: "text-yellow-600 bg-yellow-100",
  hard: "text-red-600 bg-red-100",
};

export default function QuestsPage() {
  const t = useTranslations("quests");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");

  const { data: quests, isLoading } = useQuery({
    queryKey: ["admin-quests"],
    queryFn: async () => {
      const res = await api.get("/quests");
      return (res.data?.data || res.data?.items || res.data || []) as Quest[];
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!quests) return [];
    if (!search) return quests;
    const q = search.toLowerCase();
    return quests.filter(
      (quest) =>
        quest.title.toLowerCase().includes(q) ||
        quest.description.toLowerCase().includes(q),
    );
  }, [quests, search]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{quests?.length ?? "—"}</p>
            <p className="text-sm text-muted-foreground">
              {t("total") || "Total Quests"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {quests?.filter((q) => q.isActive).length ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("active") || "Active"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {quests?.reduce((sum, q) => sum + (q.completionsCount || 0), 0) ??
                "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("completions") || "Completions"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={tCommon("search") || "Search quests..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{t("noQuests") || "No quests found"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((quest) => (
            <Card key={quest.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{quest.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[quest.difficulty] || difficultyColors.medium}`}
                  >
                    {quest.difficulty}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {quest.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Gift className="h-3.5 w-3.5" />
                    {quest.reward} pts
                  </span>
                  <span className="text-muted-foreground">
                    Target: {quest.targetValue} · {quest.period}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
