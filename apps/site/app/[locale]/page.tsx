import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";
import HeroSection from "@/components/sections/HeroSection";
import StatsSection from "@/components/sections/StatsSection";
import QuickActions from "@/components/sections/QuickActions";
import PopularProducts from "@/components/sections/PopularProducts";
import PromoBanner from "@/components/sections/PromoBanner";
import WhyVendHub from "@/components/sections/WhyVendHub";
import MachinesSection from "@/components/sections/MachinesSection";
import MenuSection from "@/components/sections/MenuSection";
import BenefitsSection from "@/components/sections/BenefitsSection";
import LoyaltyTab from "@/components/benefits/LoyaltyTab";
import PartnerSection from "@/components/sections/PartnerSection";
import AboutSection from "@/components/sections/AboutSection";
import { supabase } from "@/lib/supabase";
import {
  fetchPublicPromotions,
  fetchPublicStats,
  fetchPublicContent,
} from "@/lib/api-client";
import {
  partners as fallbackPartners,
  machines as fallbackMachines,
  promotions as fallbackPromotions,
  siteContent as fallbackContent,
  partnershipModels as fallbackModels,
} from "@/lib/data";
import type {
  Partner,
  Machine,
  MachineTypeDetail,
  Promotion,
  PartnershipModel,
} from "@/lib/types";

export default async function Home() {
  // Fetch from VendHub API (with ISR caching) + supabase adapter fallbacks
  const [
    apiStats,
    apiPromotions,
    apiContent,
    partnersResult,
    machinesResult,
    machineTypesResult,
    promosResult,
    modelsResult,
  ] = await Promise.all([
    // Real API calls (return null if API unavailable)
    fetchPublicStats(),
    fetchPublicPromotions(),
    fetchPublicContent(),
    // Supabase adapter fallbacks (return static data)
    supabase
      .from("partners")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase.from("machines").select("*").order("name"),
    supabase
      .from("machine_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("partnership_models")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  // Build CMS data — prefer API, fall back to supabase adapter → static data
  const allCms: Record<string, Record<string, string>> = {};
  if (apiContent && Object.keys(apiContent).length > 0) {
    // API returns grouped content: { hero: [...], stats: [...], about: [...] }
    for (const [section, articles] of Object.entries(apiContent)) {
      if (!allCms[section]) allCms[section] = {};
      for (const article of articles) {
        allCms[section][article.slug] = article.content;
      }
    }
  } else {
    // Fallback to static data
    for (const item of fallbackContent) {
      if (!allCms[item.section]) allCms[item.section] = {};
      allCms[item.section][item.key] = item.value;
    }
  }

  const statsCmsData = allCms["stats"] ?? {};

  // Override stats with real API data if available
  if (apiStats) {
    statsCmsData["machines_count"] = apiStats.totalMachines.toString();
    statsCmsData["products_count"] = apiStats.totalProducts.toString();
    statsCmsData["orders_count"] = apiStats.totalOrders.toString();
    statsCmsData["avg_rating"] = apiStats.avgRating.toString();
  } else {
    const machineCount = machinesResult.data?.length ?? 0;
    if (machineCount > 0) {
      statsCmsData["machines_count"] = machineCount.toString();
    }
  }

  const partnerList = (
    partnersResult.data?.length ? partnersResult.data : fallbackPartners
  ) as Partner[];
  const machineList = (
    machinesResult.data?.length ? machinesResult.data : fallbackMachines
  ) as Machine[];
  const machineTypeList = (machineTypesResult.data ??
    []) as MachineTypeDetail[];

  // Promotions: prefer API, fall back to supabase adapter
  const apiPromosMapped: Promotion[] = (apiPromotions ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    description: p.description ?? "",
    discount_type: p.discountType,
    discount_value: p.discountValue,
    min_order_amount: p.minOrderAmount ?? 0,
    valid_from: p.validFrom,
    valid_until: p.validUntil,
    is_active: true,
    sort_order: 0,
  })) as unknown as Promotion[];

  const promoList =
    apiPromosMapped.length > 0
      ? apiPromosMapped
      : ((promosResult.data?.length
          ? promosResult.data
          : fallbackPromotions) as Promotion[]);

  const modelList = (
    modelsResult.data?.length ? modelsResult.data : fallbackModels
  ) as PartnershipModel[];

  return (
    <>
      <Header />
      <main id="main" className="min-h-screen bg-cream">
        <HeroSection />
        <StatsSection cmsData={statsCmsData} />
        <QuickActions />
        <PopularProducts />
        <PromoBanner promo={promoList[0] ?? null} />
        <WhyVendHub />

        <MachinesSection
          initialMachines={machineList}
          initialMachineTypes={machineTypeList}
        />
        <MenuSection />

        <BenefitsSection loyaltyTab={<LoyaltyTab />} promotions={promoList} />
        <PartnerSection partners={partnerList} models={modelList} />
        <AboutSection />
      </main>
      <Footer />
    </>
  );
}
