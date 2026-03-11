// VendHub.uz TypeScript interfaces
// Matches Supabase schema in supabase/schema.sql

export interface ProductOption {
  name: string;
  /** Price delta (surcharge) relative to product.price. 0 = same as base price. */
  price: number;
  temperature: "hot" | "cold";
}

export interface Product {
  id: string;
  name: string;
  name_uz?: string | null;
  name_en?: string | null;
  price: number;
  category: "coffee" | "tea" | "other" | "snack";
  temperature: "hot" | "cold" | "both" | "none";
  popular: boolean;
  available: boolean;
  image_url: string | null;
  description: string | null;
  description_uz?: string | null;
  description_en?: string | null;
  detail_description?: string | null;
  detail_description_uz?: string | null;
  detail_description_en?: string | null;
  calories?: number | null;
  rating: number;
  options: ProductOption[];
  is_new: boolean;
  discount_percent: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MachineTypeSpec {
  label: string;
  value: string;
}

export interface MachineTypeAdvantage {
  title: string;
  desc: string;
}

export interface MachineTypeDetail {
  id: string;
  slug: string;
  name: string;
  model_name: string | null;
  description: string;
  hero_image_url: string | null;
  specs: MachineTypeSpec[];
  advantages: MachineTypeAdvantage[];
  gallery_images: string[];
  is_active: boolean;
  badge: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Machine {
  id: string;
  name: string;
  address: string;
  address_uz?: string | null;
  address_en?: string | null;
  type: string;
  status: "online" | "offline";
  latitude: number | null;
  longitude: number | null;
  rating: number;
  review_count: number;
  floor: string | null;
  hours: string;
  product_count: number;
  has_promotion: boolean;
  location_type: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  title: string;
  title_uz?: string | null;
  title_en?: string | null;
  badge: string;
  badge_uz?: string | null;
  badge_en?: string | null;
  description: string;
  description_uz?: string | null;
  description_en?: string | null;
  promo_code: string | null;
  gradient: string;
  conditions: string[];
  conditions_uz?: string[] | null;
  conditions_en?: string[] | null;
  valid_until: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  visibility_type: "visible" | "action_required";
  action_instruction: string;
  action_instruction_uz?: string | null;
  action_instruction_en?: string | null;
  discount_type: "percent" | "fixed" | "special" | null;
  discount_value: string | null;
  updated_at: string;
}

export interface BonusAction {
  id: string;
  title: string;
  title_uz?: string | null;
  title_en?: string | null;
  description: string;
  description_uz?: string | null;
  description_en?: string | null;
  icon: string;
  points_amount: string;
  type: "earn" | "spend";
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyPrivilege {
  id: string;
  key: string;
  label: string;
  label_uz?: string | null;
  label_en?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTier {
  id: string;
  level: string;
  emoji: string;
  discount_percent: number;
  threshold: number;
  cashback_percent: number;
  privileges: Record<string, boolean | number | string>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SiteContent {
  id: string;
  section: string;
  key: string;
  value: string;
  value_uz?: string | null;
  value_en?: string | null;
  updated_at: string;
}

export interface PartnershipModel {
  id: string;
  key: string;
  title: string;
  title_uz: string | null;
  title_en: string | null;
  description: string;
  description_uz: string | null;
  description_en: string | null;
  icon: string;
  color_scheme: string;
  benefits: string[];
  benefits_uz: string[] | null;
  benefits_en: string[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CooperationRequest {
  id: string;
  model: string;
  name: string;
  phone: string;
  comment: string | null;
  status: "new" | "read" | "processed";
  admin_notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  sort_order: number;
}
