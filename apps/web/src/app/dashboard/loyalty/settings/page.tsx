"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Gift,
  Clock,
  Percent,
  TrendingUp,
  Shield,
  Zap,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Current Configuration (read-only display of system defaults)
// ============================================================================

const LOYALTY_CONFIG = {
  levels: [
    {
      name: "Bronze",
      icon: "🥉",
      minPoints: 0,
      cashback: 1,
      multiplier: 1,
      color: "#CD7F32",
    },
    {
      name: "Silver",
      icon: "🥈",
      minPoints: 1000,
      cashback: 2,
      multiplier: 1.2,
      color: "#C0C0C0",
    },
    {
      name: "Gold",
      icon: "🥇",
      minPoints: 5000,
      cashback: 3,
      multiplier: 1.5,
      color: "#FFD700",
    },
    {
      name: "Platinum",
      icon: "💎",
      minPoints: 20000,
      cashback: 5,
      multiplier: 2,
      color: "#E5E4E2",
    },
  ],
  rules: {
    pointsExpireDays: 180,
    minSpendPoints: 100,
    maxSpendPercent: 50,
    pointsToSum: 1,
    welcomeBonus: 50,
    streakMilestones: [
      { days: 3, bonus: 15 },
      { days: 7, bonus: 50 },
      { days: 14, bonus: 100 },
      { days: 30, bonus: 300 },
    ],
  },
};

// ============================================================================
// Component
// ============================================================================

export default function LoyaltySettingsPage() {
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
          <h1 className="text-2xl font-bold">Настройки программы</h1>
          <p className="text-muted-foreground">
            Текущая конфигурация программы лояльности
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="py-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Конфигурация задаётся в коде
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Параметры программы лояльности определены в файле{" "}
              <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs">
                loyalty.constants.ts
              </code>
              . Для изменения параметров обратитесь к администратору системы.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Levels Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Уровни лояльности
          </CardTitle>
          <CardDescription>
            Пороги, кэшбэк и множители для каждого уровня
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">
                    Уровень
                  </th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">
                    Мин. баллов
                  </th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">
                    Кэшбэк
                  </th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">
                    Множитель
                  </th>
                </tr>
              </thead>
              <tbody>
                {LOYALTY_CONFIG.levels.map((level) => (
                  <tr key={level.name} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{level.icon}</span>
                        <span className="font-medium">{level.name}</span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: level.color }}
                        />
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono">
                      {level.minPoints.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <Badge variant="secondary">{level.cashback}%</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Badge variant="outline">x{level.multiplier}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Points Rules */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Правила начисления
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Приветственный бонус</span>
              </div>
              <Badge>{LOYALTY_CONFIG.rules.welcomeBonus} баллов</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-green-500" />
                <span className="text-sm">Курс списания</span>
              </div>
              <Badge variant="outline">
                1 балл = {LOYALTY_CONFIG.rules.pointsToSum} сум
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Кэшбэк</span>
              </div>
              <span className="text-sm text-muted-foreground">
                зависит от уровня ({LOYALTY_CONFIG.levels[0].cashback}%–
                {
                  LOYALTY_CONFIG.levels[LOYALTY_CONFIG.levels.length - 1]
                    .cashback
                }
                %)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Ограничения
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Мин. баллов для списания</span>
              <Badge variant="outline">
                {LOYALTY_CONFIG.rules.minSpendPoints}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Макс. % оплаты баллами</span>
              <Badge variant="outline">
                {LOYALTY_CONFIG.rules.maxSpendPercent}%
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Срок действия баллов</span>
              </div>
              <Badge variant="destructive">
                {LOYALTY_CONFIG.rules.pointsExpireDays} дней
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streak Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Бонусы за серию
          </CardTitle>
          <CardDescription>
            Бонусные баллы за непрерывную серию заказов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LOYALTY_CONFIG.rules.streakMilestones.map((milestone) => (
              <div
                key={milestone.days}
                className="text-center p-4 bg-muted/50 rounded-lg"
              >
                <p className="text-2xl mb-1">🔥</p>
                <p className="text-lg font-bold">{milestone.days} дней</p>
                <p className="text-sm text-green-600 font-medium">
                  +{milestone.bonus} баллов
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
