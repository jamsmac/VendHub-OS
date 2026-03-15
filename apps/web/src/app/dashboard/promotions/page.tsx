"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Clock, Gift, Sparkles, CheckCircle2 } from "lucide-react";
import {
  usePromotions,
  useTogglePromotionStatus,
  useDeletePromotion,
  type DbPromotion,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
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
    title: "Morning coffee -20%",
    badge: "☀️ MORNING",
    description:
      "20% off all beverages until 10:00. Start your morning with VendHub!",
    promoCode: "MORNING20",
    gradient: "from-amber-400 to-orange-500",
    discountType: "percent",
    discountValue: 20,
    conditions: ["Valid until 10:00", "All beverages", "Cannot be combined"],
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
    schedule: {
      startHour: 6,
      endHour: 10,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    },
    audience: { segment: "all" },
    affectedProducts: ["Latte", "Cappuccino", "Espresso"],
    geographicRestriction: "all",
  },
  {
    id: "2",
    title: "Refer a friend — bonus for both",
    badge: "👥 FRIENDS",
    description: "Invite a friend and both get 10,000 UZS bonus credit!",
    promoCode: "FRIEND10K",
    gradient: "from-emerald-400 to-teal-500",
    discountType: "fixed",
    discountValue: 10000,
    conditions: [
      "Friend made a purchase of 5000+",
      "Bonus for both",
      "Up to 5 invites/day",
    ],
    isActive: true,
    status: "active",
    visibilityType: "action_required",
    actionInstruction: "Share your referral link",
    createdAt: "2026-02-01",
    usageCount: 156,
    usageLimit: 500,
    uniqueUsers: 89,
    revenueImpact: 892_000,
    sortOrder: 2,
    audience: { minLevel: "Bronze" },
    affectedProducts: ["All beverages"],
    geographicRestriction: "all",
  },
  {
    id: "3",
    title: "Double weekend bonuses",
    badge: "×2 WEEKEND",
    description: "All bonus points are doubled on Saturday and Sunday!",
    promoCode: "WEEKEND2X",
    gradient: "from-purple-400 to-pink-500",
    discountType: "special",
    discountValue: 0,
    conditions: ["Sat-Sun only", "Automatic", "All purchases"],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-02-20",
    usageCount: 312,
    uniqueUsers: 201,
    revenueImpact: 1_560_000,
    sortOrder: 3,
    schedule: { daysOfWeek: [5, 6] },
    affectedProducts: ["All beverages"],
    geographicRestriction: "all",
  },
  {
    id: "4",
    title: "Latte discount",
    badge: "☕ LATTE",
    description:
      "Special price on all latte varieties — caramel, vanilla, classic",
    promoCode: "LATTE15",
    gradient: "from-yellow-400 to-amber-500",
    discountType: "percent",
    discountValue: 15,
    conditions: ["Latte only", "Any size"],
    validUntil: "2026-03-15",
    isActive: false,
    status: "ended",
    visibilityType: "visible",
    createdAt: "2026-02-10",
    usageCount: 234,
    uniqueUsers: 178,
    revenueImpact: 1_170_000,
    sortOrder: 4,
    affectedProducts: ["Latte"],
    geographicRestriction: "all",
  },
  {
    id: "5",
    title: "First order — free",
    badge: "🎉 NEW",
    description: "First beverage free for new users!",
    promoCode: "FIRSTFREE",
    gradient: "from-blue-400 to-indigo-500",
    discountType: "fixed",
    discountValue: 25000,
    conditions: ["First order only", "Max 25,000 UZS", "New users"],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-01-15",
    usageCount: 543,
    usageLimit: 1000,
    uniqueUsers: 543,
    revenueImpact: 3_210_000,
    sortOrder: 5,
    affectedProducts: ["All beverages"],
    geographicRestriction: "all",
  },
  {
    id: "6",
    title: "Night rate",
    badge: "🌙 NIGHT",
    description: "10% off all beverages after 22:00",
    promoCode: "NIGHT10",
    gradient: "from-slate-600 to-indigo-800",
    discountType: "percent",
    discountValue: 10,
    conditions: ["After 22:00", "All beverages", "Daily"],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-02-25",
    usageCount: 89,
    uniqueUsers: 67,
    revenueImpact: 445_000,
    sortOrder: 6,
    schedule: { startHour: 22, endHour: 6 },
    affectedProducts: ["All beverages"],
    geographicRestriction: "all",
  },
  {
    id: "7",
    title: "Birthday — 50% discount",
    badge: "🎂 B-DAY",
    description: "50% off on your birthday! Show your ID.",
    promoCode: "",
    gradient: "from-pink-400 to-rose-500",
    discountType: "percent",
    discountValue: 50,
    conditions: [
      "On your birthday",
      "Once per year",
      "Max discount 30,000 UZS",
    ],
    isActive: true,
    status: "active",
    visibilityType: "action_required",
    actionInstruction: "Confirm your date of birth in your profile",
    createdAt: "2026-01-01",
    usageCount: 34,
    usageLimit: 500,
    uniqueUsers: 34,
    revenueImpact: 510_000,
    sortOrder: 7,
    affectedProducts: ["All beverages"],
    geographicRestriction: "all",
  },
  {
    id: "8",
    title: "Happy Hour 14:00–16:00",
    badge: "⏰ HAPPY",
    description: "Double bonuses for purchases from 14:00 to 16:00",
    promoCode: "HAPPYHOUR",
    gradient: "from-orange-400 to-red-500",
    discountType: "special",
    discountValue: 0,
    conditions: ["14:00–16:00", "Mon–Fri", "All beverages"],
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
    affectedProducts: ["All beverages"],
    geographicRestriction: "all",
  },
  {
    id: "9",
    title: "Student discount 15%",
    badge: "🎓 STUDENT",
    description: "15% off for students with a valid student ID!",
    promoCode: "STUDENT15",
    gradient: "from-indigo-400 to-purple-500",
    discountType: "percent",
    discountValue: 15,
    conditions: ["With valid student ID", "Daily", "Cannot be combined"],
    isActive: true,
    status: "active",
    visibilityType: "visible",
    createdAt: "2026-02-20",
    usageCount: 267,
    uniqueUsers: 189,
    revenueImpact: 1_335_000,
    sortOrder: 9,
    audience: { segment: "students" },
    affectedProducts: ["All beverages"],
    geographicRestriction: "all",
  },
  {
    id: "10",
    title: "Purchase streak ×5 — bonus",
    badge: "⭐ STREAK",
    description: "5 purchases in a row = extra 5,000 UZS bonus!",
    promoCode: "STREAK5",
    gradient: "from-cyan-400 to-blue-500",
    discountType: "fixed",
    discountValue: 5000,
    conditions: ["After 5 orders", "Within 7 days", "Once per period"],
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
    affectedProducts: ["All beverages"],
    geographicRestriction: "all",
  },
];

const _MECHANICS: Mechanic[] = [
  {
    id: "time_based",
    name: "Time windows",
    description: "Discounts during specific hours (morning, night, happy hour)",
    trigger: "⏰ Time of day matches the condition",
    audienceSize: 4200,
    conversionRate: 23.5,
    revenuePerUser: 8750,
    isEnabled: true,
    icon: Clock,
  },
  {
    id: "referral",
    name: "Referrals",
    description: "Bonuses for inviting friends and their first order",
    trigger: "👥 Friend via referral link made a purchase of 5000+",
    audienceSize: 340,
    conversionRate: 18.2,
    revenuePerUser: 12500,
    isEnabled: true,
    icon: Users,
  },
  {
    id: "birthday",
    name: "Birthday",
    description: "Special discount on the user's birthday",
    trigger: "🎂 Birthday date matches",
    audienceSize: 89,
    conversionRate: 38.2,
    revenuePerUser: 15000,
    isEnabled: true,
    icon: Gift,
  },
  {
    id: "level_based",
    name: "By loyalty level",
    description: "Personalized offers for each level",
    trigger: "⭐ User level >= minimum required",
    audienceSize: 2150,
    conversionRate: 31.7,
    revenuePerUser: 10200,
    isEnabled: true,
    icon: Sparkles,
  },
  {
    id: "first_order",
    name: "First order",
    description: "Welcome discount for new users",
    trigger: "🎉 This is a new user's first order",
    audienceSize: 543,
    conversionRate: 100.0,
    revenuePerUser: 5910,
    isEnabled: true,
    icon: CheckCircle2,
  },
];

const usageByDay = [
  { day: "Mon", uses: 67 },
  { day: "Tue", uses: 54 },
  { day: "Wed", uses: 72 },
  { day: "Thu", uses: 61 },
  { day: "Fri", uses: 89 },
  { day: "Sat", uses: 112 },
  { day: "Sun", uses: 98 },
];

const usageOverTime30Days = [
  { day: "Mar 1", uses: 45, revenue: 225_000 },
  { day: "Mar 2", uses: 52, revenue: 260_000 },
  { day: "Mar 3", uses: 48, revenue: 240_000 },
  { day: "Mar 4", uses: 61, revenue: 305_000 },
  { day: "Mar 5", uses: 58, revenue: 290_000 },
  { day: "Mar 6", uses: 67, revenue: 335_000 },
  { day: "Mar 7", uses: 72, revenue: 360_000 },
  { day: "Mar 8", uses: 44, revenue: 220_000 },
  { day: "Mar 9", uses: 55, revenue: 275_000 },
  { day: "Mar 10", uses: 63, revenue: 315_000 },
  { day: "Mar 11", uses: 70, revenue: 350_000 },
  { day: "Mar 12", uses: 48, revenue: 240_000 },
  { day: "Mar 13", uses: 56, revenue: 280_000 },
  { day: "Mar 14", uses: 65, revenue: 325_000 },
  { day: "Mar 15", uses: 71, revenue: 355_000 },
];

const revenueComparison = [
  { period: "Week 1", withPromo: 42_000_000, withoutPromo: 38_000_000 },
  { period: "Week 2", withPromo: 45_500_000, withoutPromo: 41_000_000 },
  { period: "Week 3", withPromo: 48_200_000, withoutPromo: 42_500_000 },
  { period: "Week 4", withPromo: 46_800_000, withoutPromo: 40_200_000 },
];

const conversionByType = [
  { name: "Percentage", value: 34, fill: "#f59e0b" },
  { name: "Fixed", value: 28, fill: "#10b981" },
  { name: "Special", value: 38, fill: "#3b82f6" },
];

const topEffectivePromos = [
  {
    title: "First order — free",
    usageCount: 543,
    revenueImpact: 3_210_000,
    roi: 285,
  },
  {
    title: "Morning coffee -20%",
    usageCount: 487,
    revenueImpact: 2_340_000,
    roi: 245,
  },
  {
    title: "Double weekend bonuses",
    usageCount: 312,
    revenueImpact: 1_560_000,
    roi: 198,
  },
  {
    title: "Student discount 15%",
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
  {
    id: "3",
    code: "FRIEND10K2026",
    status: "active",
    createdAt: "2026-02-26",
  },
  {
    id: "4",
    code: "WEEKEND25PCT",
    status: "expired",
    createdAt: "2026-02-15",
  },
  {
    id: "5",
    code: "NEWUSER100K",
    status: "active",
    createdAt: "2026-02-25",
  },
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
  {
    hour: "10-11",
    mon: 8,
    tue: 9,
    wed: 7,
    thu: 8,
    fri: 11,
    sat: 9,
    sun: 10,
  },
  {
    hour: "11-12",
    mon: 6,
    tue: 7,
    wed: 8,
    thu: 6,
    fri: 9,
    sat: 12,
    sun: 11,
  },
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
  {
    hour: "21-22",
    mon: 8,
    tue: 9,
    wed: 7,
    thu: 8,
    fri: 10,
    sat: 12,
    sun: 11,
  },
  { hour: "22-23", mon: 6, tue: 7, wed: 5, thu: 6, fri: 8, sat: 9, sun: 8 },
  { hour: "23-00", mon: 4, tue: 5, wed: 4, thu: 4, fri: 6, sat: 7, sun: 6 },
];

const revenueData6M = [
  { month: "September", revenue: 8_500_000, promos: 4_200_000 },
  { month: "October", revenue: 9_200_000, promos: 4_800_000 },
  { month: "November", revenue: 10_100_000, promos: 5_500_000 },
  { month: "December", revenue: 12_300_000, promos: 7_100_000 },
  { month: "January", revenue: 11_800_000, promos: 6_800_000 },
  { month: "February", revenue: 10_900_000, promos: 6_200_000 },
];

const conversionFunnelData = [
  { stage: "Views", count: 12450, percentage: 100 },
  { stage: "Clicks", count: 4320, percentage: 34.7 },
  { stage: "Redemptions", count: 1732, percentage: 13.9 },
  { stage: "Revenue", count: 8_650_000, percentage: 100 },
];

const topDistrictData = [
  { district: "Shaykhantahur", usage: 456, revenue: 2_280_000 },
  { district: "Almazar", usage: 398, revenue: 1_990_000 },
  { district: "Chilanzar", usage: 387, revenue: 1_935_000 },
  { district: "Mirzabek", usage: 325, revenue: 1_625_000 },
  { district: "Sergeli", usage: 298, revenue: 1_490_000 },
];

const abTests: ABTest[] = [
  {
    id: "test1",
    name: '"Apply" button design',
    variantA: {
      description: "Blue button (current)",
      conversions: 428,
      users: 2100,
      rate: 20.4,
    },
    variantB: {
      description: "Orange button",
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
    name: 'Promo code copy ("Copy" vs "Show")',
    variantA: {
      description: '"Copy" button',
      conversions: 312,
      users: 1500,
      rate: 20.8,
    },
    variantB: {
      description: "QR code for scanning",
      conversions: 287,
      users: 1480,
      rate: 19.4,
    },
    isActive: false,
    winner: "A",
    statisticalSignificance: 78,
  },
];

// ═══ DB → UI Mapping ═══

const GRADIENTS = [
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-purple-400 to-pink-500",
  "from-blue-400 to-indigo-500",
  "from-cyan-400 to-blue-500",
  "from-slate-600 to-indigo-800",
  "from-pink-400 to-rose-500",
  "from-orange-400 to-red-500",
];

function mapDbPromotion(db: DbPromotion, idx: number): Promotion {
  const now = new Date();
  const endDate = new Date(db.end_date);
  const isExpired = endDate < now;
  return {
    id: db.id,
    title: db.title,
    badge: db.badge ?? "",
    description: db.description,
    promoCode: db.promo_code ?? "",
    gradient: db.gradient ?? GRADIENTS[idx % GRADIENTS.length],
    discountType: db.discount_type === "percent" ? "percent" : "fixed",
    discountValue: db.discount_value,
    conditions: [],
    validUntil: db.end_date,
    validFrom: db.start_date,
    isActive: db.is_active,
    status: !db.is_active ? (isExpired ? "ended" : "draft") : "active",
    visibilityType: "visible",
    createdAt: db.created_at,
    usageCount: db.usage_count,
    usageLimit: db.max_usage ?? undefined,
    uniqueUsers: 0,
    revenueImpact: 0,
    sortOrder: db.sort_order ?? idx + 1,
    audience: db.target_audience ? { segment: db.target_audience } : undefined,
  };
}

// ═══ Main Page ═══

export default function PromotionsPage() {
  const t = useTranslations("promotions");
  const { data: dbPromotions } = usePromotions();
  const [activeTab, setActiveTab] = useState<
    "list" | "analytics" | "coupons" | "abtests" | "wizard"
  >("list");

  // Mutation hooks
  const toggleMutation = useTogglePromotionStatus();
  const deleteMutation = useDeletePromotion();

  // Use live data from API, fall back to mock
  const promotions: Promotion[] = dbPromotions?.length
    ? (dbPromotions as DbPromotion[]).map(mapDbPromotion)
    : PROMOTIONS;

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

      <PromotionsKPICards promotions={promotions} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-espresso/10 pb-1 overflow-x-auto">
        {[
          { id: "list" as const, label: t("tabList") },
          { id: "analytics" as const, label: t("tabAnalytics") },
          { id: "coupons" as const, label: t("tabCoupons") },
          { id: "abtests" as const, label: t("tabABTests") },
          { id: "wizard" as const, label: t("tabWizard") },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-lg whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-espresso text-white hover:bg-espresso-dark"
                : "text-espresso-light hover:bg-espresso-50"
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* List Tab */}
      {activeTab === "list" && (
        <PromotionsList
          promotions={promotions}
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
