"use client";

import { useState } from "react";
import { Users, Clock, Gift, Sparkles, CheckCircle2 } from "lucide-react";
import { useTogglePromotionStatus, useDeletePromotion } from "@/lib/hooks";
import { PromotionsHeader } from "./components/PromotionsHeader";
import { PromotionsKPICards } from "./components/PromotionsKPICards";
import { PromotionsList } from "./components/PromotionsList";
import { PromotionsAnalytics } from "./components/PromotionsAnalytics";
import { PromotionsCoupons } from "./components/PromotionsCoupons";
import { PromotionsABTests } from "./components/PromotionsABTests";
import { PromotionsWizard } from "./components/PromotionsWizard";
import type { Promotion, Mechanic, Coupon, ABTest } from "./components/types";

// ═══ Mock Data ═══

const PROMOTIONS: Promotion[] = [
  {
    id: "1",
    title: "Утренний кофе -20%",
    badge: "☀️ УТРО",
    description: "Скидка 20% на все напитки до 10:00. Начни утро с VendHub!",
    promoCode: "MORNING20",
    gradient: "from-amber-400 to-orange-500",
    discountType: "percent",
    discountValue: 20,
    conditions: ["Действует до 10:00", "Все напитки", "Не суммируется"],
    validUntil: "2026-04-01",
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-02-15",
    usageCount: 487,
    usageLimit: 1000,
    uniqueUsers: 312,
    revenueImpact: 2_340_000,
    sortOrder: 1,
    schedule: { startHour: 6, endHour: 10, daysOfWeek: [1, 2, 3, 4, 5, 6, 0] },
    audience: { segment: "all" },
    affectedProducts: ["Латте", "Капучино", "Эспрессо"],
    geographicRestriction: "all",
  },
  {
    id: "2",
    title: "Приведи друга — бонус обоим",
    badge: "👥 ДРУЗЬЯ",
    description: "Пригласи друга и получите по 10 000 UZS на бонусный счёт!",
    promoCode: "FRIEND10K",
    gradient: "from-emerald-400 to-teal-500",
    discountType: "fixed",
    discountValue: 10000,
    conditions: [
      "Друг совершил покупку на 5000+",
      "Бонус обоим",
      "До 5 приглашений/день",
    ],
    isActive: true,
    status: "active",
    visibilityType: "action_required",
    actionInstruction: "Поделитесь реферальной ссылкой",
    createdAt: "2026-02-01",
    usageCount: 156,
    usageLimit: 500,
    uniqueUsers: 89,
    revenueImpact: 892_000,
    sortOrder: 2,
    audience: { minLevel: "Bronze" },
    affectedProducts: ["Все напитки"],
    geographicRestriction: "all",
  },
  {
    id: "3",
    title: "Двойные бонусы выходных",
    badge: "×2 WEEKEND",
    description: "В субботу и воскресенье все бонусные баллы удваиваются!",
    promoCode: "WEEKEND2X",
    gradient: "from-purple-400 to-pink-500",
    discountType: "special",
    discountValue: 0,
    conditions: ["Только Сб-Вс", "Автоматически", "Все покупки"],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-02-20",
    usageCount: 312,
    uniqueUsers: 201,
    revenueImpact: 1_560_000,
    sortOrder: 3,
    schedule: { daysOfWeek: [5, 6] },
    affectedProducts: ["Все напитки"],
    geographicRestriction: "all",
  },
  {
    id: "4",
    title: "Скидка на латте",
    badge: "☕ ЛАТТЕ",
    description:
      "Специальная цена на все виды латте — карамель, ваниль, классик",
    promoCode: "LATTE15",
    gradient: "from-yellow-400 to-amber-500",
    discountType: "percent",
    discountValue: 15,
    conditions: ["Только латте", "Любой размер"],
    validUntil: "2026-03-15",
    isActive: false,
    status: "ended",
    visibilityType: "visible",
    createdAt: "2026-02-10",
    usageCount: 234,
    uniqueUsers: 178,
    revenueImpact: 1_170_000,
    sortOrder: 4,
    affectedProducts: ["Латте"],
    geographicRestriction: "all",
  },
  {
    id: "5",
    title: "Первый заказ — бесплатно",
    badge: "🎉 NEW",
    description: "Первый напиток бесплатно для новых пользователей!",
    promoCode: "FIRSTFREE",
    gradient: "from-blue-400 to-indigo-500",
    discountType: "fixed",
    discountValue: 25000,
    conditions: [
      "Только первый заказ",
      "Макс. 25 000 UZS",
      "Новые пользователи",
    ],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-01-15",
    usageCount: 543,
    usageLimit: 1000,
    uniqueUsers: 543,
    revenueImpact: 3_210_000,
    sortOrder: 5,
    affectedProducts: ["Все напитки"],
    geographicRestriction: "all",
  },
  {
    id: "6",
    title: "Ночной тариф",
    badge: "🌙 НОЧЬ",
    description: "Скидка 10% на все напитки после 22:00",
    promoCode: "NIGHT10",
    gradient: "from-slate-600 to-indigo-800",
    discountType: "percent",
    discountValue: 10,
    conditions: ["После 22:00", "Все напитки", "Ежедневно"],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-02-25",
    usageCount: 89,
    uniqueUsers: 67,
    revenueImpact: 445_000,
    sortOrder: 6,
    schedule: { startHour: 22, endHour: 6 },
    affectedProducts: ["Все напитки"],
    geographicRestriction: "all",
  },
  {
    id: "7",
    title: "День рождения — 50% скидка",
    badge: "🎂 B-DAY",
    description: "Скидка 50% в день рождения! Покажите паспорт.",
    promoCode: "",
    gradient: "from-pink-400 to-rose-500",
    discountType: "percent",
    discountValue: 50,
    conditions: [
      "В день рождения",
      "Один раз в год",
      "Макс. скидка 30 000 UZS",
    ],
    isActive: true,
    status: "active",
    visibilityType: "action_required",
    actionInstruction: "Подтвердите дату рождения в профиле",
    createdAt: "2026-01-01",
    usageCount: 34,
    usageLimit: 500,
    uniqueUsers: 34,
    revenueImpact: 510_000,
    sortOrder: 7,
    affectedProducts: ["Все напитки"],
    geographicRestriction: "all",
  },
  {
    id: "8",
    title: "Happy Hour 14:00–16:00",
    badge: "⏰ HAPPY",
    description: "Двойные бонусы за покупки с 14:00 до 16:00",
    promoCode: "HAPPYHOUR",
    gradient: "from-orange-400 to-red-500",
    discountType: "special",
    discountValue: 0,
    conditions: ["14:00–16:00", "Пн–Пт", "Все напитки"],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-02-28",
    usageCount: 145,
    usageLimit: 500,
    uniqueUsers: 98,
    revenueImpact: 725_000,
    sortOrder: 8,
    schedule: { startHour: 14, endHour: 16, daysOfWeek: [1, 2, 3, 4, 5] },
    affectedProducts: ["Все напитки"],
    geographicRestriction: "all",
  },
  {
    id: "9",
    title: "Студенческая скидка 15%",
    badge: "🎓 СТУДЕНТ",
    description: "Скидка 15% для студентов с действующим студбилетом!",
    promoCode: "STUDENT15",
    gradient: "from-indigo-400 to-purple-500",
    discountType: "percent",
    discountValue: 15,
    conditions: ["При предъявлении студбилета", "Ежедневно", "Не суммируется"],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-02-20",
    usageCount: 267,
    uniqueUsers: 189,
    revenueImpact: 1_335_000,
    sortOrder: 9,
    audience: { segment: "students" },
    affectedProducts: ["Все напитки"],
    geographicRestriction: "all",
  },
  {
    id: "10",
    title: "Серия покупок ×5 — бонус",
    badge: "⭐ СЕРИЯ",
    description: "5 покупок подряд = дополнительный бонус 5000 UZS!",
    promoCode: "STREAK5",
    gradient: "from-cyan-400 to-blue-500",
    discountType: "fixed",
    discountValue: 5000,
    conditions: ["После 5 заказов", "В течение 7 дней", "Один раз в период"],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-02-22",
    usageCount: 98,
    usageLimit: 500,
    uniqueUsers: 56,
    revenueImpact: 280_000,
    sortOrder: 10,
    audience: { minLevel: "Silver" },
    affectedProducts: ["Все напитки"],
    geographicRestriction: "all",
  },
];

const _MECHANICS: Mechanic[] = [
  {
    id: "time_based",
    name: "Временные окна",
    description: "Скидки в определённые часы (утро, ночь, happy hour)",
    trigger: "⏰ Время суток соответствует условию",
    audienceSize: 4200,
    conversionRate: 23.5,
    revenuePerUser: 8750,
    isEnabled: true,
    icon: Clock,
  },
  {
    id: "referral",
    name: "Рефералы",
    description: "Бонусы за приглашение друзей и их первый заказ",
    trigger: "👥 Друг по реф. ссылке совершил покупку 5000+",
    audienceSize: 340,
    conversionRate: 18.2,
    revenuePerUser: 12500,
    isEnabled: true,
    icon: Users,
  },
  {
    id: "birthday",
    name: "День рождения",
    description: "Специальная скидка в день рождения пользователя",
    trigger: "🎂 Совпадает дата рождения",
    audienceSize: 89,
    conversionRate: 38.2,
    revenuePerUser: 15000,
    isEnabled: true,
    icon: Gift,
  },
  {
    id: "level_based",
    name: "По уровню лояльности",
    description: "Персонализованные предложения для каждого уровня",
    trigger: "⭐ Уровень пользователя >= минимальному",
    audienceSize: 2150,
    conversionRate: 31.7,
    revenuePerUser: 10200,
    isEnabled: true,
    icon: Sparkles,
  },
  {
    id: "first_order",
    name: "Первый заказ",
    description: "Приветственная скидка для новых пользователей",
    trigger: "🎉 Это первый заказ нового пользователя",
    audienceSize: 543,
    conversionRate: 100.0,
    revenuePerUser: 5910,
    isEnabled: true,
    icon: CheckCircle2,
  },
];

const usageByDay = [
  { day: "Пн", uses: 67 },
  { day: "Вт", uses: 54 },
  { day: "Ср", uses: 72 },
  { day: "Чт", uses: 61 },
  { day: "Пт", uses: 89 },
  { day: "Сб", uses: 112 },
  { day: "Вс", uses: 98 },
];

const usageOverTime30Days = [
  { day: "1 мар", uses: 45, revenue: 225_000 },
  { day: "2 мар", uses: 52, revenue: 260_000 },
  { day: "3 мар", uses: 48, revenue: 240_000 },
  { day: "4 мар", uses: 61, revenue: 305_000 },
  { day: "5 мар", uses: 58, revenue: 290_000 },
  { day: "6 мар", uses: 67, revenue: 335_000 },
  { day: "7 мар", uses: 72, revenue: 360_000 },
  { day: "8 мар", uses: 44, revenue: 220_000 },
  { day: "9 мар", uses: 55, revenue: 275_000 },
  { day: "10 мар", uses: 63, revenue: 315_000 },
  { day: "11 мар", uses: 70, revenue: 350_000 },
  { day: "12 мар", uses: 48, revenue: 240_000 },
  { day: "13 мар", uses: 56, revenue: 280_000 },
  { day: "14 мар", uses: 65, revenue: 325_000 },
  { day: "15 мар", uses: 71, revenue: 355_000 },
];

const revenueComparison = [
  { period: "Неделя 1", withPromo: 42_000_000, withoutPromo: 38_000_000 },
  { period: "Неделя 2", withPromo: 45_500_000, withoutPromo: 41_000_000 },
  { period: "Неделя 3", withPromo: 48_200_000, withoutPromo: 42_500_000 },
  { period: "Неделя 4", withPromo: 46_800_000, withoutPromo: 40_200_000 },
];

const conversionByType = [
  { name: "Процентные", value: 34, fill: "#f59e0b" },
  { name: "Фиксированные", value: 28, fill: "#10b981" },
  { name: "Специальные", value: 38, fill: "#3b82f6" },
];

const topEffectivePromos = [
  {
    title: "Первый заказ — бесплатно",
    usageCount: 543,
    revenueImpact: 3_210_000,
    roi: 285,
  },
  {
    title: "Утренний кофе -20%",
    usageCount: 487,
    revenueImpact: 2_340_000,
    roi: 245,
  },
  {
    title: "Двойные бонусы выходных",
    usageCount: 312,
    revenueImpact: 1_560_000,
    roi: 198,
  },
  {
    title: "Студенческая скидка 15%",
    usageCount: 267,
    revenueImpact: 1_335_000,
    roi: 167,
  },
  {
    title: "Happy Hour 14:00–16:00",
    usageCount: 145,
    revenueImpact: 725_000,
    roi: 145,
  },
];

const couponStats = {
  totalIssued: 2500,
  totalUsed: 1850,
  totalExpired: 312,
  activeRate: 74,
};

const coupons: Coupon[] = [
  {
    id: "1",
    code: "MORNINGCUP2026",
    status: "active",
    createdAt: "2026-02-28",
  },
  {
    id: "2",
    code: "LATTE50OFF",
    status: "used",
    createdAt: "2026-02-27",
    usedAt: "2026-03-01",
    usedBy: "user_123",
  },
  { id: "3", code: "FRIEND10K2026", status: "active", createdAt: "2026-02-26" },
  { id: "4", code: "WEEKEND25PCT", status: "expired", createdAt: "2026-02-15" },
  { id: "5", code: "NEWUSER100K", status: "active", createdAt: "2026-02-25" },
];

const hourlyHeatmapData = [
  { hour: "00-01", mon: 2, tue: 3, wed: 2, thu: 2, fri: 5, sat: 8, sun: 6 },
  { hour: "01-02", mon: 1, tue: 1, wed: 2, thu: 1, fri: 2, sat: 4, sun: 3 },
  { hour: "02-03", mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 2, sun: 2 },
  { hour: "03-04", mon: 0, tue: 1, wed: 1, thu: 0, fri: 1, sat: 1, sun: 1 },
  { hour: "04-05", mon: 1, tue: 0, wed: 0, thu: 1, fri: 0, sat: 0, sun: 1 },
  { hour: "05-06", mon: 2, tue: 2, wed: 1, thu: 2, fri: 1, sat: 1, sun: 2 },
  { hour: "06-07", mon: 5, tue: 6, wed: 4, thu: 5, fri: 8, sat: 3, sun: 4 },
  {
    hour: "07-08",
    mon: 12,
    tue: 11,
    wed: 13,
    thu: 11,
    fri: 15,
    sat: 7,
    sun: 9,
  },
  {
    hour: "08-09",
    mon: 18,
    tue: 19,
    wed: 17,
    thu: 20,
    fri: 22,
    sat: 12,
    sun: 14,
  },
  {
    hour: "09-10",
    mon: 15,
    tue: 14,
    wed: 16,
    thu: 15,
    fri: 18,
    sat: 11,
    sun: 13,
  },
  { hour: "10-11", mon: 8, tue: 9, wed: 7, thu: 8, fri: 11, sat: 9, sun: 10 },
  { hour: "11-12", mon: 6, tue: 7, wed: 8, thu: 6, fri: 9, sat: 12, sun: 11 },
  {
    hour: "12-13",
    mon: 14,
    tue: 13,
    wed: 15,
    thu: 14,
    fri: 17,
    sat: 21,
    sun: 19,
  },
  {
    hour: "13-14",
    mon: 12,
    tue: 11,
    wed: 13,
    thu: 12,
    fri: 14,
    sat: 18,
    sun: 16,
  },
  {
    hour: "14-15",
    mon: 22,
    tue: 21,
    wed: 23,
    thu: 21,
    fri: 26,
    sat: 28,
    sun: 25,
  },
  {
    hour: "15-16",
    mon: 24,
    tue: 23,
    wed: 25,
    thu: 24,
    fri: 29,
    sat: 31,
    sun: 28,
  },
  {
    hour: "16-17",
    mon: 18,
    tue: 19,
    wed: 17,
    thu: 18,
    fri: 21,
    sat: 24,
    sun: 22,
  },
  {
    hour: "17-18",
    mon: 16,
    tue: 15,
    wed: 17,
    thu: 16,
    fri: 19,
    sat: 22,
    sun: 20,
  },
  {
    hour: "18-19",
    mon: 19,
    tue: 18,
    wed: 20,
    thu: 19,
    fri: 23,
    sat: 26,
    sun: 24,
  },
  {
    hour: "19-20",
    mon: 15,
    tue: 14,
    wed: 16,
    thu: 15,
    fri: 18,
    sat: 21,
    sun: 19,
  },
  {
    hour: "20-21",
    mon: 11,
    tue: 12,
    wed: 10,
    thu: 11,
    fri: 13,
    sat: 16,
    sun: 14,
  },
  { hour: "21-22", mon: 8, tue: 9, wed: 7, thu: 8, fri: 10, sat: 12, sun: 11 },
  { hour: "22-23", mon: 6, tue: 7, wed: 5, thu: 6, fri: 8, sat: 9, sun: 8 },
  { hour: "23-00", mon: 4, tue: 5, wed: 4, thu: 4, fri: 6, sat: 7, sun: 6 },
];

const revenueData6M = [
  { month: "Сентябрь", revenue: 8_500_000, promos: 4_200_000 },
  { month: "Октябрь", revenue: 9_200_000, promos: 4_800_000 },
  { month: "Ноябрь", revenue: 10_100_000, promos: 5_500_000 },
  { month: "Декабрь", revenue: 12_300_000, promos: 7_100_000 },
  { month: "Январь", revenue: 11_800_000, promos: 6_800_000 },
  { month: "Февраль", revenue: 10_900_000, promos: 6_200_000 },
];

const conversionFunnelData = [
  { stage: "Просмотры", count: 12450, percentage: 100 },
  { stage: "Клики", count: 4320, percentage: 34.7 },
  { stage: "Использования", count: 1732, percentage: 13.9 },
  { stage: "Выручка", count: 8_650_000, percentage: 100 },
];

const topDistrictData = [
  { district: "Шайхантахур", usage: 456, revenue: 2_280_000 },
  { district: "Алмазар", usage: 398, revenue: 1_990_000 },
  { district: "Чилонзор", usage: 387, revenue: 1_935_000 },
  { district: "Мирзабек", usage: 325, revenue: 1_625_000 },
  { district: "Сергелийский", usage: 298, revenue: 1_490_000 },
];

const abTests: ABTest[] = [
  {
    id: "test1",
    name: 'Дизайн кнопки "Применить"',
    variantA: {
      description: "Синяя кнопка (текущий)",
      conversions: 428,
      users: 2100,
      rate: 20.4,
    },
    variantB: {
      description: "Оранжевая кнопка",
      conversions: 512,
      users: 2090,
      rate: 24.5,
    },
    isActive: true,
    winner: "B",
    statisticalSignificance: 95,
  },
  {
    id: "test2",
    name: 'Копия промокода ("Скопировать vs Показать")',
    variantA: {
      description: 'Кнопка "Скопировать"',
      conversions: 312,
      users: 1500,
      rate: 20.8,
    },
    variantB: {
      description: "QR-код для сканирования",
      conversions: 287,
      users: 1480,
      rate: 19.4,
    },
    isActive: false,
    winner: "A",
    statisticalSignificance: 78,
  },
];

// ═══ Main Page ═══

export default function PromotionsPage() {
  const [activeTab, setActiveTab] = useState<
    "list" | "analytics" | "coupons" | "abtests" | "wizard"
  >("list");

  // Mutation hooks
  const toggleMutation = useTogglePromotionStatus();
  const deleteMutation = useDeletePromotion();

  const analyticsData = {
    usageOverTime30Days,
    revenueComparison,
    conversionByType,
    usageByDay,
    couponStats,
    hourlyHeatmapData,
    conversionFunnelData,
    topEffectivePromos,
    revenueData6M,
    topDistrictData,
  };

  const handleNewPromo = () => {
    setActiveTab("wizard");
  };

  const handleToggleStatus = (id: string, isActive: boolean) => {
    toggleMutation.mutate({ id, isActive });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <PromotionsHeader onNewPromoClick={handleNewPromo} />

      <PromotionsKPICards promotions={PROMOTIONS} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-espresso/10 pb-1 overflow-x-auto">
        {[
          { id: "list" as const, label: "Акции" },
          { id: "analytics" as const, label: "Аналитика" },
          { id: "coupons" as const, label: "Купоны" },
          { id: "abtests" as const, label: "A/B Тесты" },
          { id: "wizard" as const, label: "Создать акцию" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-espresso text-white"
                : "text-espresso-light hover:bg-espresso-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Tab */}
      {activeTab === "list" && (
        <PromotionsList
          promotions={PROMOTIONS}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <PromotionsAnalytics data={analyticsData} />
      )}

      {/* Coupons Tab */}
      {activeTab === "coupons" && (
        <PromotionsCoupons couponStats={couponStats} coupons={coupons} />
      )}

      {/* A/B Tests Tab */}
      {activeTab === "abtests" && <PromotionsABTests abTests={abTests} />}

      {/* Wizard Tab */}
      {activeTab === "wizard" && (
        <PromotionsWizard onCancel={() => setActiveTab("list")} />
      )}
    </div>
  );
}
