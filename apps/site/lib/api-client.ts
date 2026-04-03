/**
 * VendHub API Client for Site (vendhub.uz)
 *
 * Fetches data from public (no-auth) API endpoints.
 * Falls back to static data from data.ts if API is unavailable.
 *
 * API Base: configured via NEXT_PUBLIC_API_URL env var,
 * defaults to production URL.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api-production-1e7b5.up.railway.app";

const API_PREFIX = `${API_BASE}/api/v1`;

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_PREFIX}${path}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes (ISR)
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const json = await res.json();
    // API wraps in TransformInterceptor envelope: { data, statusCode, message }
    return json.data ?? json;
  } catch {
    return null;
  }
}

// ============================================
// PUBLIC ENDPOINTS
// ============================================

export interface PublicStats {
  totalMachines: number;
  totalProducts: number;
  totalOrders: number;
  totalClients: number;
  avgRating: number;
}

export async function fetchPublicStats(): Promise<PublicStats | null> {
  return fetchApi<PublicStats>("/client/public/stats");
}

export interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  nameUz: string | null;
  description: string | null;
  descriptionUz: string | null;
  category: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  images: string[];
  vatRate: number;
}

export async function fetchPublicProducts(): Promise<PublicProduct[]> {
  const result = await fetchApi<{ data: PublicProduct[] }>(
    "/client/public/products?limit=100",
  );
  return result?.data ?? [];
}

export interface PublicPromotion {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number | null;
  validFrom: string | null;
  validUntil: string | null;
}

export async function fetchPublicPromotions(): Promise<PublicPromotion[]> {
  const result = await fetchApi<{ data: PublicPromotion[] }>(
    "/client/public/promotions",
  );
  return result?.data ?? [];
}

export interface LoyaltyTierInfo {
  level: string;
  name: string;
  nameUz: string;
  nameRu: string;
  minPoints: number;
  maxPoints: number | null;
  multiplier: number;
  cashbackPercent: number;
  privileges: string[];
}

export async function fetchLoyaltyTiers(): Promise<LoyaltyTierInfo[]> {
  const result = await fetchApi<{ tiers: LoyaltyTierInfo[] }>(
    "/client/public/loyalty-tiers",
  );
  return result?.tiers ?? [];
}

export interface PublicBanner {
  id: string;
  titleRu: string;
  descriptionRu: string | null;
  titleUz: string | null;
  descriptionUz: string | null;
  imageUrl: string | null;
  imageUrlMobile: string | null;
  linkUrl: string | null;
  buttonTextRu: string | null;
  buttonTextUz: string | null;
  position: string;
  sortOrder: number;
  backgroundColor: string | null;
  textColor: string | null;
}

export async function fetchPublicBanners(
  position?: string,
): Promise<PublicBanner[]> {
  const params = position ? `?position=${position}` : "";
  const result = await fetchApi<{ data: PublicBanner[] }>(
    `/cms/banners/public${params}`,
  );
  return result?.data ?? [];
}

export interface PublicContentSection {
  id: string;
  slug: string;
  title: string;
  content: string;
  sortOrder: number;
  tags: string[] | null;
}

export async function fetchPublicContent(
  category?: string,
): Promise<Record<string, PublicContentSection[]>> {
  const params = category ? `?category=${category}` : "";
  const result = await fetchApi<{
    data: Record<string, PublicContentSection[]>;
  }>(`/cms/banners/public/content${params}`);
  return result?.data ?? {};
}
