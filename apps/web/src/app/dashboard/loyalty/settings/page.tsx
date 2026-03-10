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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";

// ============================================================================
// Current Configuration (read-only display of system defaults)
// ============================================================================

const LOYALTY_CONFIG = {
  levels: [
    {
      name: "Bronze",
      icon: "\u{1F949}",
      minPoints: 0,
      cashback: 1,
      multiplier: 1,
      color: "#CD7F32",
    },
    {
      name: "Silver",
      icon: "\u{1F948}",
      minPoints: 1000,
      cashback: 2,
      multiplier: 1.2,
      color: "#C0C0C0",
    },
    {
      name: "Gold",
      icon: "\u{1F947}",
      minPoints: 5000,
      cashback: 3,
      multiplier: 1.5,
      color: "#FFD700",
    },
    {
      name: "Platinum",
      icon: "\u{1F48E}",
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
  const t = useTranslations("loyaltySettings");

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
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="py-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {t("infoBannerTitle")}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t("infoBannerTextBefore")}{" "}
              <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs">
                loyalty.constants.ts
              </code>
              {t("infoBannerTextAfter")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Levels Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {t("levelsTitle")}
          </CardTitle>
          <CardDescription>{t("levelsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-left py-2 text-sm font-medium text-muted-foreground">
                    {t("colLevel")}
                  </TableHead>
                  <TableHead className="text-right py-2 text-sm font-medium text-muted-foreground">
                    {t("colMinPoints")}
                  </TableHead>
                  <TableHead className="text-right py-2 text-sm font-medium text-muted-foreground">
                    {t("colCashback")}
                  </TableHead>
                  <TableHead className="text-right py-2 text-sm font-medium text-muted-foreground">
                    {t("colMultiplier")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LOYALTY_CONFIG.levels.map((level) => (
                  <TableRow key={level.name} className="border-b last:border-0">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{level.icon}</span>
                        <span className="font-medium">{level.name}</span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: level.color }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono">
                      {level.minPoints}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Badge variant="secondary">{level.cashback}%</Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Badge variant="outline">x{level.multiplier}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Points Rules */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {t("accrualRulesTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">{t("welcomeBonus")}</span>
              </div>
              <Badge>
                {t("welcomeBonusValue", {
                  points: LOYALTY_CONFIG.rules.welcomeBonus,
                })}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-green-500" />
                <span className="text-sm">{t("redemptionRate")}</span>
              </div>
              <Badge variant="outline">
                {t("redemptionRateValue", {
                  sum: LOYALTY_CONFIG.rules.pointsToSum,
                })}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm">{t("cashback")}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {t("cashbackRange", {
                  min: LOYALTY_CONFIG.levels[0].cashback,
                  max: LOYALTY_CONFIG.levels[LOYALTY_CONFIG.levels.length - 1]
                    .cashback,
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("restrictionsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">{t("minPointsRedeem")}</span>
              <Badge variant="outline">
                {LOYALTY_CONFIG.rules.minSpendPoints}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">{t("maxPayPercent")}</span>
              <Badge variant="outline">
                {LOYALTY_CONFIG.rules.maxSpendPercent}%
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">{t("pointsExpiry")}</span>
              </div>
              <Badge variant="destructive">
                {t("pointsExpiryValue", {
                  days: LOYALTY_CONFIG.rules.pointsExpireDays,
                })}
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
            {t("streakTitle")}
          </CardTitle>
          <CardDescription>{t("streakDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LOYALTY_CONFIG.rules.streakMilestones.map((milestone) => (
              <div
                key={milestone.days}
                className="text-center p-4 bg-muted/50 rounded-lg"
              >
                <p className="text-2xl mb-1">{"\u{1F525}"}</p>
                <p className="text-lg font-bold">
                  {t("streakDays", { days: milestone.days })}
                </p>
                <p className="text-sm text-green-600 font-medium">
                  {t("streakBonus", { bonus: milestone.bonus })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
