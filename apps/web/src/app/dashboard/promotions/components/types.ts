export type DiscountType = "percent" | "fixed" | "special";
export type VisibilityType = "visible" | "action_required";
export type MechanicType =
  | "time_based"
  | "referral"
  | "birthday"
  | "level_based"
  | "first_order";
export type PromotionStatus = "active" | "scheduled" | "ended" | "draft";

export interface Promotion {
  id: string;
  title: string;
  badge: string;
  description: string;
  promoCode: string;
  gradient: string;
  discountType: DiscountType;
  discountValue: number;
  conditions: string[];
  validUntil?: string;
  validFrom?: string;
  isActive: boolean;
  status: PromotionStatus;
  visibilityType: VisibilityType;
  actionInstruction?: string;
  createdAt: string;
  usageCount: number;
  usageLimit?: number;
  uniqueUsers: number;
  revenueImpact: number;
  sortOrder: number;
  schedule?: {
    startHour?: number;
    endHour?: number;
    daysOfWeek?: number[];
  };
  audience?: {
    minLevel?: string;
    segment?: string;
    device?: string;
  };
  affectedProducts?: string[];
  geographicRestriction?: "all" | "specific";
  restrictedMachines?: string[];
}

export interface Mechanic {
  id: MechanicType;
  name: string;
  description: string;
  trigger: string;
  audienceSize: number;
  conversionRate: number;
  revenuePerUser: number;
  isEnabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Coupon {
  id: string;
  code: string;
  status: "active" | "used" | "expired";
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
}

export interface ABTest {
  id: string;
  name: string;
  variantA: {
    description: string;
    conversions: number;
    users: number;
    rate: number;
  };
  variantB: {
    description: string;
    conversions: number;
    users: number;
    rate: number;
  };
  isActive: boolean;
  winner?: "A" | "B";
  statisticalSignificance?: number;
}
