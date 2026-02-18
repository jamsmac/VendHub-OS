"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Star, TrendingUp, Gift, Percent } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loyaltyApi } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface LevelInfo {
  level: string;
  name: string;
  nameUz: string;
  cashbackPercent: number;
  bonusMultiplier: number;
  minPoints: number;
  color: string;
  icon: string;
}

// ============================================================================
// Component
// ============================================================================

export default function LoyaltyLevelsPage() {
  const { data: levelsData, isLoading } = useQuery({
    queryKey: ["loyalty-levels-info"],
    queryFn: async () => {
      const res = await loyaltyApi.getLevelsInfo();
      return res.data as {
        levels: LevelInfo[];
        currentLevel?: string;
        currentPoints?: number;
      };
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["loyalty-stats-for-levels"],
    queryFn: async () => {
      const res = await loyaltyApi.getStats({});
      return res.data;
    },
  });

  const levels = levelsData?.levels || [];
  const levelDistribution = statsData?.levelDistribution || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/loyalty">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Уровни лояльности</h1>
          <p className="text-muted-foreground">
            Информация об уровнях и привилегиях
          </p>
        </div>
      </div>

      {/* Levels Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-40 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {levels.map((level, index) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dist = levelDistribution.find(
              (d: any) => d.level === level.level,
            );
            const nextLevel = levels[index + 1];

            return (
              <Card key={level.level} className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: level.color }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{level.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{level.name}</CardTitle>
                        <CardDescription>{level.nameUz}</CardDescription>
                      </div>
                    </div>
                    {dist && (
                      <Badge variant="secondary">
                        {dist.count} чел ({dist.percent.toFixed(1)}%)
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <Percent className="h-4 w-4 mx-auto mb-1 text-green-600" />
                      <p className="text-lg font-bold">
                        {level.cashbackPercent}%
                      </p>
                      <p className="text-xs text-muted-foreground">Кэшбэк</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                      <p className="text-lg font-bold">
                        x{level.bonusMultiplier}
                      </p>
                      <p className="text-xs text-muted-foreground">Множитель</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <Star className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
                      <p className="text-lg font-bold">
                        {level.minPoints.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Мин. баллов
                      </p>
                    </div>
                  </div>

                  {nextLevel && (
                    <div className="text-xs text-muted-foreground text-center border-t pt-3">
                      До <span className="font-medium">{nextLevel.name}</span>:{" "}
                      {nextLevel.minPoints.toLocaleString()} баллов
                    </div>
                  )}
                  {!nextLevel && (
                    <div className="text-xs text-center border-t pt-3">
                      <Badge variant="outline" className="text-xs">
                        Максимальный уровень
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rules Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Правила программы
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Баллы начисляются автоматически за каждую покупку в виде кэшбэка
            (процент зависит от уровня).
          </p>
          <p>
            Уровень определяется по общему количеству заработанных баллов за всё
            время.
          </p>
          <p>
            Баллы можно потратить на скидку при оплате заказа (минимум 100
            баллов, максимум 50% от суммы заказа).
          </p>
          <p>Неиспользованные баллы сгорают через 180 дней после начисления.</p>
          <p>1 балл = 1 сум при списании.</p>
        </CardContent>
      </Card>
    </div>
  );
}
